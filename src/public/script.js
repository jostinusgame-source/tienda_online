/**
 * SPEEDCOLLECT | OFFICIAL SCRIPT
 * Phase 1: Real Stock & Banking Security
 */

const API_URL = '/api'; 
let cart = []; // El carrito ahora se sincroniza, no vive solo aquí
let allProducts = [];
let currentProductModalId = null;
let itiInstance = null; 

// CONFIGURACIÓN
const ADMIN_EMAIL = "jsusgamep@itc.edu.co"; 
const DISCOUNT_RATE = 0.20; 
let isOfferActive = false;

// ==========================================
// 1. INICIALIZACIÓN (DOM READY)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SpeedCollect System Initialized");
    
    // Iniciar Componentes
    checkAuthStatus();
    updateCartUI(); // Sincroniza con DB al cargar
    initChatbot(); 

    // Detectar página y cargar módulos
    const storeContainer = document.getElementById('products-container');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const reviewForm = document.getElementById('reviewForm');
    const countdownEl = document.getElementById('seconds');

    if (storeContainer) { 
        initStore(); 
        if(countdownEl) startCountdown(); 
    }
    
    if (registerForm) initStrictRegister();
    if (loginForm) initLogin();
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
});

// ==========================================
// 2. FUNCIONES GLOBALES (VENTANA)
// ==========================================

// ABRIR CARRITO (CONECTADO A BASE DE DATOS)
window.openPaymentModal = async function() {
    const token = localStorage.getItem('token');
    
    // Si no está logueado, mostrar alerta
    if (!token) {
        const loginModalEl = document.getElementById('loginRequiredModal');
        if(loginModalEl && window.bootstrap) {
            new bootstrap.Modal(loginModalEl).show();
        } else {
            alert("Por favor inicia sesión para ver tu garaje.");
            window.location.href = 'login.html';
        }
        return;
    }
    
    // Obtener datos reales del servidor
    try {
        const res = await fetch(`${API_URL}/store/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(!res.ok) throw new Error("Error cargando garaje");
        
        const data = await res.json(); // { items: [...], total: 0 }
        
        const list = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        
        // Guardamos para el PDF
        window.currentCartItems = data.items;
        window.currentCartTotal = data.total;

        if (data.items.length === 0) {
            list.innerHTML = '<p class="text-center text-muted py-4">Tu garaje está vacío.</p>';
        } else {
            list.innerHTML = data.items.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                <div>
                    <span class="fw-bold text-white me-2">${item.quantity}x</span> 
                    <span class="text-light">${item.name}</span>
                </div>
                <span class="text-success fw-bold">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>`).join('');
        }
        
        if(totalEl) totalEl.innerText = `$${parseFloat(data.total).toFixed(2)}`;
        
        const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        paymentModal.show();

    } catch (e) {
        console.error(e);
        alert("No se pudo sincronizar el garaje con el servidor.");
    }
};

// AÑADIR (RESERVA REAL EN STOCK)
window.addToCart = async function(id) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert("🔒 Debes iniciar sesión para reservar este auto (Stock Limitado).");
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
            // Éxito: El stock ha sido apartado
            alert(`✅ ${data.message}`);
            updateCartUI(); // Actualizar contador
        } else {
            // Error: Stock insuficiente, etc.
            alert(`⚠️ ${data.message}`);
        }
    } catch (e) {
        alert("Error de conexión al reservar.");
    }
};

// MODAL DE DETALLE (VISUALIZACIÓN)
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    currentProductModalId = id;
    
    // Calcular Precio Visual
    let price = parseFloat(p.price);
    let htmlPrice = `<span class="text-danger fw-bold fs-2">$${price.toFixed(2)}</span>`;
    
    if (isOfferActive) {
        let discPrice = price * (1 - DISCOUNT_RATE);
        htmlPrice = `
            <div class="d-flex flex-column">
                <span class="text-decoration-line-through text-muted small">$${price.toFixed(2)}</span>
                <span class="text-success fw-bold fs-2">$${discPrice.toFixed(2)}</span>
            </div>`;
    }

    // Rellenar Datos
    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerHTML = htmlPrice;
    
    const stockEl = document.getElementById('modal-p-stock');
    if(stockEl) {
        stockEl.innerHTML = p.stock > 0 
            ? `<span class="text-success"><i class="fa-solid fa-check"></i> Disponible (${p.stock})</span>` 
            : '<span class="text-danger"><i class="fa-solid fa-xmark"></i> Agotado</span>';
    }

    // Lógica 3D vs Imagen
    const visualContainer = document.getElementById('visual-container');
    if(visualContainer) {
        // Detectar si es un archivo GLB local o URL externa
        if (p.model_url && (p.model_url.endsWith('.glb') || p.model_url.endsWith('.gltf') || p.model_url.includes('googleusercontent'))) {
            // Usar Model Viewer
            visualContainer.innerHTML = `
                <div class="ratio ratio-16x9 bg-dark border border-secondary rounded overflow-hidden shadow">
                    <model-viewer 
                        src="${p.model_url}" 
                        alt="${p.name}" 
                        auto-rotate 
                        camera-controls 
                        shadow-intensity="1"
                        style="width: 100%; height: 100%; background-color: #151515;"
                    ></model-viewer>
                    <div class="position-absolute bottom-0 w-100 text-center text-white-50 small py-1" style="background:rgba(0,0,0,0.6)">
                        <i class="fa-solid fa-hand-pointer"></i> Arrastra para rotar 360°
                    </div>
                </div>`;
        } else {
            // Imagen Estática
            const img = p.image_url || 'https://via.placeholder.com/800x600?text=No+Image';
            visualContainer.innerHTML = `
                <img src="${img}" class="img-fluid rounded border border-secondary w-100 shadow" 
                     style="max-height: 400px; object-fit: cover;">`;
        }
    }
    
    loadReviews(id);
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
};

// CHECKOUT (TRANSACCIÓN FINAL + PDF)
window.checkout = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm("¿Confirmar compra y debitar de tu cuenta?")) return;

    try {
        const res = await fetch(`${API_URL}/store/checkout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            // Generar PDF usando los items que teníamos en memoria
            generatePDF(window.currentCartItems, data.total, data.orderId);
            
            alert("¡COMPRA EXITOSA! El auto es legalmente tuyo.");
            updateCartUI(); // Resetear contador
            
            const modalEl = document.getElementById('paymentModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();
            
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (e) {
        alert("Error procesando la transacción.");
    }
};

window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// ==========================================
// 3. LÓGICA DE TIENDA (CATÁLOGO)
// ==========================================

async function initStore() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    
    try {
        const res = await fetch(`${API_URL}/store/products`);
        if (!res.ok) throw new Error("API Offline");
        
        allProducts = await res.json();
        
        if (loader) loader.classList.add('d-none');
        if (container) {
            container.classList.remove('d-none');
            renderProducts('all');
        }

        // Filtros
        document.querySelectorAll('#category-filters button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                applyFilters();
            });
        });

        // Búsqueda
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', applyFilters);
        
        // Precio
        const priceRange = document.getElementById('price-range');
        if (priceRange) {
            priceRange.addEventListener('input', (e) => {
                const pVal = document.getElementById('price-val');
                if(pVal) pVal.innerText = `$${e.target.value}`;
                applyFilters();
            });
        }

    } catch (e) {
        if(loader) loader.innerHTML = '<div class="text-danger">Error de conexión.</div>';
    }
}

function applyFilters() {
    const activeBtn = document.querySelector('#category-filters button.active');
    const cat = activeBtn ? activeBtn.dataset.filter : 'all';
    
    const search = document.getElementById('search-input')?.value.toLowerCase() || '';
    const maxPrice = parseFloat(document.getElementById('price-range')?.value || 10000);

    const filtered = allProducts.filter(p => {
        const matchCat = cat === 'all' || p.category === cat;
        const matchText = p.name.toLowerCase().includes(search);
        const matchPrice = parseFloat(p.price) <= maxPrice;
        return matchCat && matchText && matchPrice;
    });

    renderProducts(null, filtered);
}

function renderProducts(filter, list = null) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    let data = list || (filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter));

    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No hay resultados.</div>';
        return;
    }

    container.innerHTML = data.map(p => {
        const img = p.image_url || 'https://via.placeholder.com/400';
        const isOut = p.stock <= 0;
        let priceHtml = `<span class="fs-4 fw-bold text-white">$${parseFloat(p.price).toFixed(2)}</span>`;
        
        if(isOfferActive) {
            let disc = p.price * (1 - DISCOUNT_RATE);
            priceHtml = `<div class="d-flex flex-column"><span class="small text-decoration-line-through text-muted">$${p.price}</span><span class="text-success fw-bold">$${disc.toFixed(2)}</span></div>`;
        }

        return `
        <div class="col-md-6 col-lg-4 mb-4 animate__animated animate__fadeIn">
            <div class="card custom-card h-100 shadow" style="background:#111; border:1px solid #333;" onclick="openModal(${p.id})">
                <div class="position-relative overflow-hidden" style="height:250px;">
                    <img src="${img}" class="w-100 h-100 object-fit-cover" alt="${p.name}">
                    ${p.model_url ? '<span class="position-absolute bottom-0 end-0 m-2 badge bg-black border border-secondary text-white">3D</span>' : ''}
                    ${isOut ? '<div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center text-white fw-bold">AGOTADO</div>' : ''}
                </div>
                <div class="card-body bg-black text-white border-top border-secondary">
                    <h5 class="text-truncate fw-bold brand-font" style="font-size:1rem">${p.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        ${priceHtml}
                        <button class="btn btn-outline-danger btn-sm rounded-circle p-2" onclick="event.stopPropagation(); addToCart(${p.id})"><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 4. UTILIDADES (PDF, AUTH, CHATBOT)
// ==========================================

async function updateCartUI() {
    const token = localStorage.getItem('token');
    const el = document.getElementById('cart-count');
    if (!el || !token) return;

    try {
        const res = await fetch(`${API_URL}/store/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
        if(res.ok) {
            const data = await res.json();
            const count = data.items.reduce((acc, item) => acc + item.quantity, 0);
            el.innerText = count;
            el.style.display = count > 0 ? 'block' : 'none';
        }
    } catch(e) {}
}

function checkAuthStatus() {
    const uStr = localStorage.getItem('user');
    if (!uStr) return;
    try {
        const u = JSON.parse(uStr);
        const div = document.getElementById('auth-section');
        if (div && u) {
            // Check admin
            const crown = document.getElementById('admin-crown');
            if (crown && u.email === ADMIN_EMAIL) crown.style.display = 'block';
            
            div.innerHTML = `<button onclick="logout()" class="btn btn-outline-light btn-sm fw-bold border-0">SALIR</button>`;
        }
    } catch(e) {}
}

function generatePDF(items, total, orderId) {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    
    doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("SPEEDCOLLECT", 15, 20);
    
    doc.setTextColor(0,0,0); doc.setFontSize(12);
    doc.text(`Orden #: ${orderId}`, 15, 50);
    doc.text(`Cliente: ${user.name}`, 15, 58);

    const body = items.map(i => [i.quantity, i.name, `$${i.price}`, `$${(i.price*i.quantity).toFixed(2)}`]);
    doc.autoTable({ startY: 70, head: [['Cant', 'Modelo', 'Unit', 'Total']], body: body });
    
    doc.text(`TOTAL: $${parseFloat(total).toFixed(2)}`, 140, doc.lastAutoTable.finalY + 15);
    doc.save(`Factura_${orderId}.pdf`);
}

// OFERTA Y CHATBOT
function startCountdown() {
    let time = 600;
    setInterval(() => {
        if(time <= 0) { isOfferActive = true; return; }
        time--;
        const h = Math.floor(time/3600), m = Math.floor((time%3600)/60), s = time%60;
        const elH = document.getElementById('hours');
        if(elH) {
            elH.innerText = h<10?'0'+h:h; 
            document.getElementById('minutes').innerText = m<10?'0'+m:m; 
            document.getElementById('seconds').innerText = s<10?'0'+s:s;
        }
    }, 1000);
}

function initChatbot() {
    const trigger = document.getElementById('chatTrigger');
    const widget = document.getElementById('chatWidget');
    const close = document.getElementById('closeChat');
    const send = document.getElementById('sendChat');
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');

    if(!trigger || !widget) return;

    trigger.onclick = () => { widget.style.display = 'flex'; trigger.style.display = 'none'; };
    close.onclick = () => { widget.style.display = 'none'; trigger.style.display = 'flex'; };

    const sendMsg = () => {
        if(!input.value.trim()) return;
        body.innerHTML += `<div class="mb-2 text-end"><span class="bg-danger text-white p-2 rounded">${input.value}</span></div>`;
        input.value = '';
        body.scrollTop = body.scrollHeight;
        setTimeout(() => {
            body.innerHTML += `<div class="mb-2"><span class="bg-secondary text-white p-2 rounded">Para soporte técnico, usa el WhatsApp.</span></div>`;
            body.scrollTop = body.scrollHeight;
        }, 1000);
    };

    if(send) send.onclick = sendMsg;
    if(input) input.onkeypress = (e) => { if(e.key === 'Enter') sendMsg(); };
}

// LOGIN Y REGISTRO
function initLogin() {
    const f = document.getElementById('login-form');
    if(f) f.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method:'POST', 
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-pass').value
                })
            });
            const d = await res.json();
            if(res.ok) {
                localStorage.setItem('token', d.token);
                localStorage.setItem('user', JSON.stringify(d.user));
                window.location.href = 'index.html';
            } else alert(d.message);
        } catch(err) { alert('Error conexión'); }
    });
}

function initStrictRegister() {
    const f = document.getElementById('register-form');
    const pInput = document.getElementById('reg-phone');
    
    if(pInput && window.intlTelInput) {
        itiInstance = window.intlTelInput(pInput, { 
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: cb => fetch("https://ipapi.co/json").then(r=>r.json()).then(d=>cb(d.country_code)).catch(()=>cb("co"))
        });
    }

    if(f) f.addEventListener('submit', async e => {
        e.preventDefault();
        const pass = document.getElementById('reg-pass').value;
        if(pass.length < 6) return alert("Contraseña muy corta");
        
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    name: document.getElementById('reg-name').value,
                    email: document.getElementById('reg-email').value,
                    password: pass,
                    phone: itiInstance ? itiInstance.getNumber() : pInput.value
                })
            });
            const d = await res.json();
            if(res.ok) {
                localStorage.setItem('token', d.token);
                localStorage.setItem('user', JSON.stringify(d.user));
                window.location.href = 'index.html';
            } else alert(d.message);
        } catch(err) { alert('Error servidor'); }
    });
}

// RESEÑAS
async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    if(c) {
        try {
            const res = await fetch(`${API_URL}/products/${pid}/reviews`);
            const d = await res.json();
            c.innerHTML = d.length ? d.map(r => `<div class="small mb-2 border-bottom border-secondary pb-1 text-white"><strong>${r.user_name}:</strong> ${r.comment}</div>`).join('') : '<small class="text-muted">Sin reseñas aún.</small>';
        } catch(e) { c.innerHTML = '<small class="text-danger">Error cargando.</small>'; }
    }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if(!token) return alert("Inicia sesión.");
    const txt = document.getElementById('review-comment').value;
    if(!txt) return;

    await fetch(`${API_URL}/reviews`, {
        method:'POST',
        headers:{'Content-Type':'application/json', 'Authorization':`Bearer ${token}`},
        body: JSON.stringify({ productId: currentProductModalId, rating: 5, comment: txt })
    });
    
    loadReviews(currentProductModalId);
    document.getElementById('review-comment').value = '';
}