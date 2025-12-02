/**
 * SPEEDCOLLECT | SCRIPT MAESTRO (FINAL V6 - UNLOCKED 3D)
 * Corrección: Visor 3D con movimiento libre 360° y Catálogo robusto.
 */

console.log("✅ Script Cargado y Listo.");

const API_URL = '/api'; 
let allProducts = []; // Memoria global de productos
let currentProductModalId = null;
let itiInstance = null; 
let isOfferActive = false;

// PAGINACIÓN
let currentPage = 0;
const ITEMS_PER_PAGE = 10;

// CONFIG
const ADMIN_EMAIL = "jsusgamep@itc.edu.co"; 
const DISCOUNT_RATE = 0.20; 

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Auth & UI
    checkAuthStatus();
    updateCartUI(); 
    initChatbot(); 

    // Detectar elementos
    const storeContainer = document.getElementById('products-container');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const reviewForm = document.getElementById('reviewForm');
    const countdownEl = document.getElementById('seconds');

    // Cargar Catálogo
    if (storeContainer) { 
        setupStoreListeners();
        loadCatalog(true); // Carga inicial
        if(countdownEl) startCountdown(); 
    }
    
    // Forms
    if (registerForm) initStrictRegister();
    if (loginForm) initLogin();
    
    // Reviews
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
});

// ==========================================
// 2. CATÁLOGO & FILTROS
// ==========================================

function setupStoreListeners() {
    // Botones Categoría
    document.querySelectorAll('#category-filters button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadCatalog(true); // Resetear al cambiar filtro
        });
    });

    // Buscador Texto
    const sInput = document.getElementById('search-input');
    let timeout = null;
    if(sInput) {
        sInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => loadCatalog(true), 500);
        });
    }

    // Slider Precio
    const pRange = document.getElementById('price-range');
    const pVal = document.getElementById('price-val');
    if(pRange) {
        pRange.addEventListener('input', (e) => {
            if(pVal) pVal.innerText = `$${parseInt(e.target.value).toLocaleString()}`;
        });
        pRange.addEventListener('change', () => loadCatalog(true));
    }

    // Botón Cargar Más (Si no existe en HTML, lo creamos)
    if(!document.getElementById('load-more-btn')) {
        const moreBtn = document.createElement('button');
        moreBtn.id = 'load-more-btn';
        moreBtn.className = 'btn btn-outline-light d-block mx-auto mt-5 mb-5 fw-bold';
        moreBtn.innerText = 'CARGAR MÁS MODELOS';
        moreBtn.style.display = 'none';
        moreBtn.onclick = () => {
            currentPage++;
            loadCatalog(false); // No resetear, añadir abajo
        };
        const container = document.getElementById('products-container');
        if(container && container.parentNode) {
            container.parentNode.appendChild(moreBtn);
        }
    }
}

async function loadCatalog(reset = false) {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
        currentPage = 0;
        if(container) {
            container.innerHTML = '';
            container.classList.remove('d-none');
        }
        allProducts = []; // Limpiar memoria
    }

    if(loader) loader.style.display = 'block';

    try {
        // Obtener filtros activos
        const activeCat = document.querySelector('#category-filters button.active');
        const category = activeCat ? activeCat.dataset.filter : 'all';
        const searchText = document.getElementById('search-input')?.value || '';
        const maxPrice = document.getElementById('price-range')?.value || 1000000;

        // Construir URL
        let url = `${API_URL}/store/products?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`;
        
        if (category !== 'all') url += `&category=${category}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;
        
        if (searchText.length === 1) url += `&initial=${searchText}`; 
        else if (searchText.length > 1) url += `&search=${searchText}`; 

        const res = await fetch(url);
        if (!res.ok) throw new Error("Error API");
        
        const newProducts = await res.json();

        if(loader) loader.style.display = 'none';

        // Caso: Sin resultados
        if (newProducts.length === 0 && currentPage === 0) {
            if(container) container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3>No hay autos con esos filtros.</h3></div>';
            if(loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        // Guardar en memoria global para Modales
        if (reset) {
            allProducts = newProducts;
        } else {
            allProducts = [...allProducts, ...newProducts];
        }

        renderProducts(newProducts);

        // Mostrar botón si hay posibilidad de más items (si trajo 10, quizás hay más)
        if (loadMoreBtn) {
            loadMoreBtn.style.display = newProducts.length < ITEMS_PER_PAGE ? 'none' : 'block';
        }

    } catch (e) {
        console.error(e);
        if(loader) {
            loader.style.display = 'none';
            if(container) container.innerHTML = '<p class="text-danger text-center py-5">Error de conexión. Intenta recargar.</p>';
        }
    }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    if(!container) return;

    const html = products.map(p => {
        const isOut = p.stock <= 0;
        const img = p.image_url || 'https://via.placeholder.com/400?text=No+Image';
        
        let price = parseFloat(p.price);
        let priceHtml = `<span class="fs-4 fw-bold text-white">$${price.toLocaleString()}</span>`;

        if (p.discount) { 
            priceHtml = `
                <div class="d-flex flex-column align-items-start">
                    <span class="old-price small">$${parseFloat(p.base_price).toLocaleString()}</span>
                    <span class="offer-price">$${price.toLocaleString()}</span>
                </div>`;
        }

        const badge3D = p.model_url ? '<div class="position-absolute bottom-0 end-0 m-2 badge bg-black border border-secondary">3D</div>' : '';
        const overlay = isOut ? '<div class="overlay-sold d-flex align-items-center justify-content-center"><span>AGOTADO</span></div>' : '';

        return `
        <div class="col-md-6 col-lg-4 mb-4 animate__animated animate__fadeIn">
            <div class="card custom-card h-100 shadow product-card" onclick="openModal(${p.id})">
                <div class="position-relative overflow-hidden" style="height: 250px;">
                    <img src="${img}" class="w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category}</div>
                    ${badge3D}
                    ${overlay}
                </div>
                <div class="card-body bg-black text-white">
                    <h5 class="fw-bold text-uppercase mb-1 text-truncate brand-font" style="font-size:1rem">${p.name}</h5>
                    <small class="text-silver mb-3 text-truncate">${p.description || 'Sin descripción'}</small>
                    <div class="mt-auto d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                        ${priceHtml}
                        <button class="btn btn-outline-danger btn-sm rounded-circle p-2" 
                            onclick="event.stopPropagation(); addToCart(${p.id})" 
                            ${isOut ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', html);
}

// ==========================================
// 3. MODAL DETALLE (3D DESBLOQUEADO)
// ==========================================
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    currentProductModalId = id;
    
    let price = parseFloat(p.price);
    let htmlPrice = `<span class="text-danger fw-bold fs-2">$${price.toLocaleString()}</span>`;
    if (p.discount) {
        htmlPrice = `<div class="d-flex flex-column"><span class="text-decoration-line-through text-muted small">$${parseFloat(p.base_price).toLocaleString()}</span> <span class="text-success fw-bold fs-2">$${price.toLocaleString()}</span></div>`;
    }

    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerHTML = htmlPrice;
    
    const stockEl = document.getElementById('modal-p-stock');
    if(stockEl) stockEl.innerHTML = p.stock > 0 
        ? `<span class="text-success">Disponible: ${p.stock}</span>` 
        : '<span class="text-danger">Agotado</span>';

    // Lógica Visual
    const visual = document.getElementById('visual-container');
    if(visual) {
        // Detectar .glb, .gltf o links de Google/Sketchfab raw
        if (p.model_url && (p.model_url.includes('.glb') || p.model_url.includes('.gltf'))) {
            // VISOR 3D SIN RESTRICCIONES DE ROTACIÓN
            visual.innerHTML = `
                <div class="ratio ratio-16x9 bg-black border border-secondary rounded overflow-hidden shadow">
                    <model-viewer 
                        src="${p.model_url}" 
                        alt="${p.name}" 
                        auto-rotate 
                        camera-controls 
                        ar
                        shadow-intensity="1"
                        style="width: 100%; height: 100%; background-color: #151515;"
                    ></model-viewer>
                    <div class="position-absolute bottom-0 w-100 text-center text-white-50 small py-1" style="background:rgba(0,0,0,0.6)">
                        <i class="fa-solid fa-hand-pointer"></i> Toca y arrastra para rotar libremente
                    </div>
                </div>`;
        } else {
            visual.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded w-100 shadow">`;
        }
    }
    
    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
};

// ==========================================
// 4. CARRITO Y PAGOS
// ==========================================

window.addToCart = async function(id) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        if (confirm("🔒 Acceso Restringido.\nDebes iniciar sesión para reservar stock. ¿Ir al login?")) {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/store/cart`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId: id, quantity: 1 })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`✅ ${data.message}`);
            updateCartUI(); 
        } else {
            alert(`⚠️ ${data.message}`);
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión con el servidor.");
    }
};

window.openPaymentModal = async function() {
    const token = localStorage.getItem('token');
    if (!token) return alert("Inicia sesión.");
    
    try {
        const res = await fetch(`${API_URL}/store/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
        
        if(res.status === 401) { window.logout(); return; }
        
        const data = await res.json();
        window.currentCartItems = data.items;
        window.currentCartTotal = data.total;

        const list = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');

        if (data.items.length === 0) {
            list.innerHTML = '<p class="text-center text-muted py-4">Tu garaje está vacío.</p>';
        } else {
            list.innerHTML = data.items.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-2">
                <div>
                    <span class="fw-bold text-white me-2">${item.quantity}x</span> 
                    <span class="text-light">${item.name}</span>
                </div>
                <span class="text-success fw-bold">$${(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
            </div>`).join('');
        }
        
        if(totalEl) totalEl.innerText = `$${parseFloat(data.total).toLocaleString()}`;
        new bootstrap.Modal(document.getElementById('paymentModal')).show();

    } catch (e) { alert("Error cargando carrito"); }
};

window.checkout = async function() {
    const token = localStorage.getItem('token');
    if (!token || !confirm("¿Confirmar compra?")) return;

    try {
        const res = await fetch(`${API_URL}/store/checkout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            if (typeof generatePDF === 'function') {
                generatePDF(window.currentCartItems, data.total, data.orderId);
            }
            alert("¡COMPRA EXITOSA!");
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            loadCatalog(true); // Recargar para ver stock actualizado
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (e) { alert("Error procesando pago."); }
};

// ==========================================
// 5. UTILIDADES AUXILIARES
// ==========================================

async function updateCartUI() {
    const token = localStorage.getItem('token');
    const el = document.getElementById('cart-count');
    if (!el || !token) return;
    
    try {
        const res = await fetch(`${API_URL}/store/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            const count = data.items.reduce((acc, item) => acc + item.quantity, 0);
            el.innerText = count;
            el.style.display = count > 0 ? 'block' : 'none';
        }
    } catch(e) {}
}

function generatePDF(items, total, id) {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user')) || { name: "Cliente" };
    
    doc.setFillColor(10,10,10); doc.rect(0,0,210,40,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(22); doc.text("SPEEDCOLLECT", 15, 25);
    
    doc.setTextColor(0,0,0); doc.setFontSize(12);
    doc.text(`Factura #: ${id}`, 15, 50);
    doc.text(`Cliente: ${user.name}`, 15, 60);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 70);
    
    const subtotal = parseFloat(total) / 1.19;
    const iva = parseFloat(total) - subtotal;

    const body = items.map(i => [i.quantity, i.name, `$${parseFloat(i.price).toLocaleString()}`, `$${(i.price * i.quantity).toLocaleString()}`]);
    doc.autoTable({ startY: 80, head: [['Cant', 'Auto', 'Unit', 'Total']], body: body });
    
    let y = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: $${subtotal.toLocaleString(undefined,{maximumFractionDigits:2})}`, 130, y);
    doc.text(`IVA (19%): $${iva.toLocaleString(undefined,{maximumFractionDigits:2})}`, 130, y+10);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${parseFloat(total).toLocaleString()}`, 130, y+20);
    doc.save(`Factura_${id}.pdf`);
}

function checkAuthStatus() {
    const u = localStorage.getItem('user');
    if (u) {
        try {
            const user = JSON.parse(u);
            const div = document.getElementById('auth-section');
            const crown = document.getElementById('admin-crown');
            if (div) div.innerHTML = `<button onclick="logout()" class="btn btn-outline-light btn-sm fw-bold">SALIR</button>`;
            if (crown && user.email === ADMIN_EMAIL) crown.style.display = 'block';
        } catch(e){}
    }
}

window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Lógica de Venta Nocturna
function startCountdown() {
    let t = 600;
    setInterval(() => {
        if (t <= 0) {
            if (!isOfferActive) activateNightSale();
            return;
        }
        t--;
        const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
        const elH = document.getElementById('hours');
        if(elH) {
            elH.innerText = h<10?'0'+h:h; 
            document.getElementById('minutes').innerText = m<10?'0'+m:m; 
            document.getElementById('seconds').innerText = s<10?'0'+s:s;
        }
    }, 1000);
}

async function activateNightSale() {
    isOfferActive = true;
    try {
        await fetch(`${API_URL}/store/toggle-night-sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true })
        });
        alert("🌙 VENTA NOCTURNA: Precios actualizados.");
        loadCatalog(true);
        const offers = document.getElementById('offers');
        if(offers) offers.style.border = "2px solid #00ff00";
    } catch(e) {}
}

// Chatbot
function initChatbot() { 
    const t = document.getElementById('chatTrigger'), w = document.getElementById('chatWidget'), c = document.getElementById('closeChat'), s = document.getElementById('sendChat'), i = document.getElementById('chatInput'), b = document.getElementById('chatBody');
    if(!t) return;
    t.onclick = () => { w.style.display = 'flex'; t.style.display = 'none'; };
    c.onclick = () => { w.style.display = 'none'; t.style.display = 'flex'; };

    const send = () => {
        if (!i.value.trim()) return;
        b.innerHTML += `<div class="mb-2 text-end"><span class="bg-danger text-white p-2 rounded">${i.value}</span></div>`;
        i.value = '';
        b.scrollTop = b.scrollHeight;
        setTimeout(() => {
            b.innerHTML += `<div class="mb-2"><span class="bg-secondary text-white p-2 rounded">Para soporte, usa el WhatsApp oficial.</span></div>`;
            b.scrollTop = b.scrollHeight;
        }, 1000);
    };
    if(s) s.onclick = send;
    if(i) i.onkeypress = (e) => { if (e.key === 'Enter') send(); };
}

// Auth
function initStrictRegister() { /* Lógica Auth (ya incluida en tu index) */ }
function initLogin() { /* Lógica Auth (ya incluida en tu index) */ }

// Reseñas
async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    if (c) {
        try {
            const res = await fetch(`${API_URL}/products/${pid}/reviews`);
            const d = await res.json();
            c.innerHTML = d.length ? d.map(r => `<div class="small mb-2 text-white border-bottom border-secondary pb-1"><strong>${r.user_name}</strong>: ${r.comment}</div>`).join('') : '<small class="text-muted">Sin reseñas.</small>';
        } catch (e) { c.innerHTML = '<small class="text-danger">Error cargando.</small>'; }
    }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert("Inicia sesión.");
    const txt = document.getElementById('review-comment').value;
    if (!txt) return;

    await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId: currentProductModalId, rating: 5, comment: txt })
    });
    loadReviews(currentProductModalId);
    document.getElementById('review-comment').value = '';
}