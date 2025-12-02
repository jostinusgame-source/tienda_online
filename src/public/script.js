/**
 * SPEEDCOLLECT | SCRIPT MAESTRO (FINAL V4)
 * Corrección: Visor 3D Desbloqueado (Movimiento Libre)
 */

console.log("✅ Script Cargado.");

const API_URL = '/api'; 
let allProducts = []; // Memoria global de productos cargados
let currentProductModalId = null;
let itiInstance = null; 
let isOfferActive = false;

// VARIABLES DE PAGINACIÓN
let currentPage = 0;
const ITEMS_PER_PAGE = 10;

// CONFIGURACIÓN
const ADMIN_EMAIL = "jsusgamep@itc.edu.co"; 
const DISCOUNT_RATE = 0.20; 

// ==========================================
// 1. INICIALIZACIÓN (DOM READY)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Auth & UI Base
    checkAuthStatus();
    updateCartUI(); // Sincroniza bolita roja con DB
    initChatbot(); 

    // 2. Detectar página y cargar módulos
    const storeContainer = document.getElementById('products-container');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const reviewForm = document.getElementById('reviewForm');
    const countdownEl = document.getElementById('seconds');

    // Lógica de Tienda (Catálogo)
    if (storeContainer) { 
        setupStoreListeners();
        loadCatalog(true); // Carga inicial (Reset = true)
        if(countdownEl) startCountdown(); 
    }
    
    // Formularios
    if (registerForm) initStrictRegister();
    if (loginForm) initLogin();
    
    // Reseñas
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
});

// ==========================================
// 2. CATÁLOGO INTELIGENTE (Paginación y Filtros)
// ==========================================

function setupStoreListeners() {
    // Filtros Categoría
    document.querySelectorAll('#category-filters button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadCatalog(true); // Resetear y cargar nueva categoría
        });
    });

    // Buscador (Debounce para no saturar)
    const sInput = document.getElementById('search-input');
    let timeout = null;
    if(sInput) {
        sInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => loadCatalog(true), 500);
        });
    }

    // Filtro Precio
    const pRange = document.getElementById('price-range');
    const pVal = document.getElementById('price-val');
    if(pRange) {
        pRange.addEventListener('input', (e) => {
            if(pVal) pVal.innerText = `$${parseInt(e.target.value).toLocaleString()}`;
        });
        pRange.addEventListener('change', () => loadCatalog(true)); // Cargar al soltar
    }

    // Botón Cargar Más (Creación dinámica si no existe en HTML)
    if(!document.getElementById('load-more-btn')) {
        const moreBtn = document.createElement('button');
        moreBtn.id = 'load-more-btn';
        moreBtn.className = 'btn btn-outline-light d-block mx-auto mt-4 mb-5';
        moreBtn.innerText = 'CARGAR MÁS MODELOS';
        moreBtn.style.display = 'none';
        moreBtn.onclick = () => {
            currentPage++;
            loadCatalog(false); // No resetear, añadir al final
        };
        const container = document.getElementById('products-container');
        if(container && container.parentNode) {
            container.parentNode.appendChild(moreBtn);
        }
    } else {
        // Si ya existe (lo pusimos en el HTML), le damos funcionalidad
        const moreBtn = document.getElementById('load-more-btn');
        moreBtn.onclick = () => {
            currentPage++;
            loadCatalog(false);
        };
    }
}

// FUNCIÓN MAESTRA DE CARGA
async function loadCatalog(reset = false) {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
        currentPage = 0;
        if(container) container.innerHTML = '';
        allProducts = []; // Limpiar memoria para nueva búsqueda
        if(container) container.classList.remove('d-none'); // Asegurar visible
    }

    if(loader) loader.style.display = 'block';

    try {
        // Recoger filtros
        const activeCat = document.querySelector('#category-filters button.active');
        const category = activeCat ? activeCat.dataset.filter : 'all';
        const searchText = document.getElementById('search-input')?.value || '';
        const maxPrice = document.getElementById('price-range')?.value || 1000000;

        // Construir URL con parámetros
        let url = `${API_URL}/store/products?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`;
        
        if (category !== 'all') url += `&category=${category}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;
        
        // Lógica Inicial vs Búsqueda completa
        if (searchText.length === 1) {
            url += `&initial=${searchText}`; // Busca por letra inicial (Ej: C -> Chevrolet)
        } else if (searchText.length > 1) {
            url += `&search=${searchText}`; // Busca coincidencia completa
        }

        const res = await fetch(url);
        
        if (!res.ok) throw new Error("Error en servidor");
        
        const newProducts = await res.json();

        if(loader) loader.style.display = 'none';

        if (newProducts.length === 0 && currentPage === 0) {
            if(container) container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3>No se encontraron vehículos en el radar.</h3></div>';
            if(loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        // IMPORTANTE: Guardar en memoria global para que los modales funcionen
        if (reset) {
            allProducts = newProducts;
        } else {
            allProducts = [...allProducts, ...newProducts];
        }

        renderProducts(newProducts);

        // Controlar botón "Cargar Más"
        if (loadMoreBtn) {
            loadMoreBtn.style.display = newProducts.length < ITEMS_PER_PAGE ? 'none' : 'block';
        }

    } catch (e) {
        console.error(e);
        if(loader) {
            loader.style.display = 'none';
            if(container) container.innerHTML = '<p class="text-danger text-center">Error de conexión. Intenta recargar.</p>';
        }
    }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    if(!container) return;

    const html = products.map(p => {
        const isOut = p.stock <= 0;
        const img = p.image_url || 'https://via.placeholder.com/400';
        
        // Manejo de Precio (Normal vs Oferta)
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
                    <h5 class="fw-bold text-truncate brand-font" style="font-size:1rem">${p.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        ${priceHtml}
                        <button class="btn btn-outline-danger btn-sm rounded-circle p-2" onclick="event.stopPropagation(); addToCart(${p.id})"><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', html);
}

// ==========================
// 3. MODAL DETALLE (3D INTERACTIVO LIBRE)
// ==========================
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
    
    document.getElementById('modal-p-stock').innerHTML = p.stock > 0 
        ? `<span class="text-success">Disponible: ${p.stock}</span>` 
        : '<span class="text-danger">Agotado</span>';

    const visual = document.getElementById('visual-container');
    if(visual) {
        // CORRECCIÓN 3D: Detección amplia y sin restricciones de movimiento
        if (p.model_url && (p.model_url.includes('.glb') || p.model_url.includes('.gltf'))) {
            visual.innerHTML = `
                <div class="ratio ratio-16x9 bg-black border border-secondary rounded overflow-hidden shadow">
                    <model-viewer 
                        src="${p.model_url}" 
                        alt="${p.name}" 
                        auto-rotate 
                        camera-controls 
                        ar
                        ar-modes="webxr scene-viewer quick-look"
                        shadow-intensity="1" 
                        style="width: 100%; height: 100%; background-color: #151515;"
                    ></model-viewer>
                    <div class="position-absolute bottom-0 w-100 text-center text-white-50 small py-1" style="background:rgba(0,0,0,0.6)">
                        <i class="fa-solid fa-hand-pointer"></i> Mueve para rotar | Rueda para Zoom
                    </div>
                </div>`;
        } else {
            visual.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded w-100">`;
        }
    }
    
    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
};

// ==========================
// 4. CARRITO, PAGOS & UTILIDADES
// ==========================

window.addToCart = async function(id) {
    const token = localStorage.getItem('token');
    if(!token) {
        if(confirm("🔒 Inicia sesión para reservar stock. ¿Ir al login?")) window.location.href='login.html';
        return;
    }
    try {
        const res = await fetch(`${API_URL}/store/cart`, {
            method:'POST', headers:{'Content-Type':'application/json', 'Authorization':`Bearer ${token}`},
            body: JSON.stringify({productId: id, quantity: 1})
        });
        const d = await res.json();
        if(res.ok) { alert("✅ " + d.message); updateCartUI(); } 
        else alert("⚠️ " + d.message);
    } catch(e) { alert("Error conexión"); }
};

window.openPaymentModal = async function() {
    const token = localStorage.getItem('token');
    if(!token) return alert("Inicia sesión.");
    try {
        const res = await fetch(`${API_URL}/store/cart`, { headers: {'Authorization':`Bearer ${token}`} });
        if(res.status === 401) { window.logout(); return; }
        const data = await res.json();
        
        window.currentCartItems = data.items;
        const list = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        
        if(data.items.length === 0) list.innerHTML = '<p class="text-center text-muted">Garaje vacío.</p>';
        else {
            list.innerHTML = data.items.map(i => `
                <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-1">
                    <div><span class="fw-bold text-white">${i.quantity}x</span> <span class="text-light">${i.name}</span></div>
                    <span class="text-success fw-bold">$${(parseFloat(i.price)*i.quantity).toLocaleString()}</span>
                </div>`).join('');
        }
        document.getElementById('cart-total').innerText = `$${parseFloat(data.total).toLocaleString()}`;
        new bootstrap.Modal(document.getElementById('paymentModal')).show();
    } catch(e) { alert("Error cargando carrito"); }
};

window.checkout = async function() {
    const token = localStorage.getItem('token');
    if(!token) return;
    if(!confirm("¿Confirmar compra y procesar factura?")) return;

    try {
        const res = await fetch(`${API_URL}/store/checkout`, { method:'POST', headers:{'Authorization':`Bearer ${token}`} });
        const d = await res.json();
        if(res.ok) {
            generatePDF(window.currentCartItems, d.total, d.orderId);
            alert("¡COMPRA EXITOSA! El auto es legalmente tuyo.");
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            loadCatalog(true); // Actualizar stock visual
        } else alert("Error: " + d.message);
    } catch(e) { alert("Error procesando la transacción."); }
};

function updateCartUI() {
    const token = localStorage.getItem('token');
    const el = document.getElementById('cart-count');
    if(!token || !el) return;
    fetch(`${API_URL}/store/cart`, {headers:{'Authorization':`Bearer ${token}`}})
        .then(r=>r.json()).then(d=>{
            const c = d.items?.reduce((a,b)=>a+b.quantity,0) || 0;
            el.innerText = c; el.style.display = c > 0 ? 'block' : 'none';
        });
}

function generatePDF(items, total, id) {
    if(!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    
    doc.setFillColor(10,10,10); doc.rect(0,0,210,40,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(22); doc.text("SPEEDCOLLECT RECIBO", 15, 25);
    
    doc.setTextColor(0,0,0); doc.setFontSize(12);
    doc.text(`Orden: #${id}`, 15, 50);
    doc.text(`Cliente: ${user.name}`, 15, 60);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 70);
    
    const subtotal = parseFloat(total) / 1.19;
    const iva = parseFloat(total) - subtotal;

    const body = items.map(i => [i.quantity, i.name, `$${parseFloat(i.price).toLocaleString()}`, `$${(i.price*i.quantity).toLocaleString()}`]);
    doc.autoTable({ startY: 80, head: [['Cant', 'Auto', 'Unit', 'Total']], body: body });
    
    let y = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: $${subtotal.toLocaleString(undefined,{maximumFractionDigits:2})}`, 130, y);
    doc.text(`IVA (19%): $${iva.toLocaleString(undefined,{maximumFractionDigits:2})}`, 130, y+10);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${parseFloat(total).toLocaleString()}`, 130, y+20);
    
    doc.save(`Factura_${id}.pdf`);
}

// VENTA NOCTURNA
function startCountdown() {
    let t = 600;
    setInterval(() => {
        if(t <= 0) { if(!isOfferActive) activateNightSale(); return; }
        t--;
        const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
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
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({active:true})
        });
        alert("🌙 VENTA NOCTURNA: ¡Precios actualizados!");
        loadCatalog(true);
        const offers = document.getElementById('offers');
        if(offers) offers.style.border = "2px solid #00ff00";
    } catch(e) {}
}

// CHATBOT
function initChatbot() { 
    const t = document.getElementById('chatTrigger'), w = document.getElementById('chatWidget'), c = document.getElementById('closeChat'), s = document.getElementById('sendChat'), i = document.getElementById('chatInput'), b = document.getElementById('chatBody');
    if(!t) return;
    t.onclick = () => { w.style.display='flex'; t.style.display='none'; };
    c.onclick = () => { w.style.display='none'; t.style.display='flex'; };
    const send = () => {
        if(!i.value.trim()) return;
        const msg = i.value.toLowerCase();
        b.innerHTML += `<div class="mb-2 text-end"><span class="bg-danger text-white p-2 rounded">${i.value}</span></div>`;
        i.value=''; b.scrollTop=b.scrollHeight;
        
        let reply = "Para ventas directas, usa WhatsApp.";
        if(msg.includes('precio')) reply = "Los precios están en el catálogo.";
        if(msg.includes('stock')) reply = "El stock es en tiempo real.";
        if(msg.includes('envio')) reply = "Envíos a todo el país.";

        setTimeout(()=> { b.innerHTML+=`<div class="mb-2"><span class="bg-secondary text-white p-2 rounded">${reply}</span></div>`; b.scrollTop=b.scrollHeight; }, 800);
    };
    if(s) s.onclick = send;
    if(i) i.onkeypress = (e) => { if(e.key==='Enter') send(); };
}

function initStrictRegister() {
    const f = document.getElementById('register-form');
    const pInput = document.getElementById('reg-phone');
    
    if (pInput && window.intlTelInput) {
        itiInstance = window.intlTelInput(pInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: cb => fetch("https://ipapi.co/json").then(r=>r.json()).then(d=>cb(d.country_code)).catch(()=>cb("co"))
        });
    }

    if (f) {
        f.addEventListener('submit', async e => {
            e.preventDefault();
            const pass = document.getElementById('reg-pass').value;
            const msg = document.getElementById('global-msg') || document.createElement('div');
            if (pass.length < 8) return alert("Contraseña insegura (min 8 chars)");
            
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: document.getElementById('reg-name').value,
                        email: document.getElementById('reg-email').value,
                        password: pass,
                        phone: itiInstance ? itiInstance.getNumber() : pInput.value
                    })
                });
                const d = await res.json();
                if (res.ok) {
                    alert(d.message);
                    window.location.href = 'login.html';
                } else {
                    alert(d.message);
                }
            } catch (err) { alert("Error servidor"); }
        });
    }
}

function initLogin() {
    const f = document.getElementById('login-form');
    if (f) {
        f.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('login-email').value,
                        password: document.getElementById('login-pass').value
                    })
                });
                const d = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', d.token);
                    localStorage.setItem('user', JSON.stringify(d.user));
                    window.location.href = 'index.html';
                } else {
                    alert(d.message);
                }
            } catch (err) { alert("Error conexión"); }
        });
    }
}

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