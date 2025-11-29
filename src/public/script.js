/**
 * SPEEDCOLLECT | OFFICIAL SCRIPT
 * Version: Bulletproof
 */

const API_URL = '/api'; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;
let itiInstance = null; 

// CONFIGURACIÓN
const ADMIN_EMAIL = "jsusgamep@itc.edu.co"; 
const DISCOUNT_RATE = 0.20; 
let isOfferActive = false;

// ==========================================
// 1. DEFINICIÓN DE FUNCIONES GLOBALES (PRIORIDAD ALTA)
// ==========================================
// Las definimos aquí arriba para asegurar que existan antes de que alguien haga clic.

window.openPaymentModal = function() {
    console.log("Abriendo carrito...");
    const token = localStorage.getItem('token');
    
    // Validar sesión
    if (!token) {
        // Intentar abrir modal de login si existe, sino alert
        const loginModalEl = document.getElementById('loginRequiredModal');
        if (loginModalEl && window.bootstrap) {
            new bootstrap.Modal(loginModalEl).show();
        } else {
            // Fallback seguro si el modal no carga
            if(confirm("Debes iniciar sesión para ver tu garaje. ¿Ir al login?")) {
                window.location.href = 'login.html';
            }
        }
        return;
    }
    
    // Renderizar Carrito
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    let total = 0;
    
    if (list) {
        if (cart.length === 0) {
            list.innerHTML = '<p class="text-center text-secondary py-3">Tu garaje está vacío.</p>';
        } else {
            list.innerHTML = cart.map(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                return `
                <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-2">
                    <div>
                        <span class="fw-bold text-white me-2">${item.quantity}x</span> 
                        <span class="text-light small">${item.name}</span>
                    </div>
                    <span class="text-success fw-bold">$${itemTotal.toFixed(2)}</span>
                </div>`;
            }).join('');
        }
    }
    
    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
    
    const paymentModalEl = document.getElementById('paymentModal');
    if (paymentModalEl && window.bootstrap) {
        new bootstrap.Modal(paymentModalEl).show();
    }
};

window.addToCart = function(id, priceOverride) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const existingItem = cart.find(i => i.id === id);
    const finalPrice = priceOverride || (isOfferActive ? product.price * (1 - DISCOUNT_RATE) : product.price);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, price: finalPrice, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    
    // Feedback visual en consola o alerta suave
    console.log(`Añadido: ${product.name}`);
};

window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    currentProductModalId = id;
    
    // Precios
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

    // Elementos del DOM (con chequeo de seguridad)
    const elName = document.getElementById('modal-p-name');
    const elDesc = document.getElementById('modal-p-desc');
    const elPrice = document.getElementById('modal-p-price');
    const elStock = document.getElementById('modal-p-stock');
    const elVisual = document.getElementById('visual-container');

    if (elName) elName.innerText = p.name;
    if (elDesc) elDesc.innerText = p.description;
    if (elPrice) elPrice.innerHTML = htmlPrice;
    if (elStock) elStock.innerHTML = p.stock > 0 
        ? `<span class="text-success"><i class="fa-solid fa-check"></i> Disponible (${p.stock})</span>` 
        : '<span class="text-danger">Agotado</span>';

    // 3D o Imagen
    if (elVisual) {
        if (p.model_url && (p.model_url.endsWith('.glb') || p.model_url.endsWith('.gltf'))) {
            elVisual.innerHTML = `
                <div class="ratio ratio-16x9 bg-black border border-secondary rounded overflow-hidden shadow">
                    <model-viewer 
                        src="${p.model_url}" 
                        alt="${p.name}" 
                        auto-rotate 
                        camera-controls 
                        shadow-intensity="1"
                        style="width: 100%; height: 100%;"
                    ></model-viewer>
                </div>`;
        } else {
            const img = p.image_url || 'https://via.placeholder.com/800x600';
            elVisual.innerHTML = `<img src="${img}" class="img-fluid rounded border border-secondary w-100">`;
        }
    }
    
    // Cargar reseñas si la función existe
    if (typeof loadReviews === 'function') loadReviews(id);
    
    const modalEl = document.getElementById('productModal');
    if (modalEl && window.bootstrap) {
        new bootstrap.Modal(modalEl).show();
    }
};

window.checkout = function() {
    if (!window.jspdf) {
        alert("El sistema de PDF no está listo. Recarga la página.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, 'F'); // Fondo negro
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("SPEEDCOLLECT RECIBO", 15, 20);
    
    doc.setFontSize(12);
    doc.text(`Cliente: ${user ? user.name : 'Invitado'}`, 15, 40);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 50);

    const body = cart.map(i => [i.quantity, i.name, `$${i.price.toFixed(2)}`]);
    doc.autoTable({
        startY: 60,
        head: [['Cant', 'Auto', 'Precio']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [200, 0, 0] }
    });

    doc.save(`Recibo_${Date.now()}.pdf`);
    
    // Limpiar
    cart = [];
    localStorage.removeItem('cart');
    updateCartUI();
    
    const modalEl = document.getElementById('paymentModal');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl).hide();
    }
    alert("¡Compra realizada!");
};

window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// ==========================================
// 2. INICIALIZACIÓN (DOM LOAD)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        checkAuthStatus();
        updateCartUI();
        
        // Elementos condicionales
        const productsContainer = document.getElementById('products-container');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (productsContainer) initStore();
        if (document.getElementById('seconds')) startCountdown();
        
        initChatbot(); // Chat siempre activo si el HTML existe

        if (loginForm) initLogin();
        if (registerForm) initStrictRegister();

    } catch (e) {
        console.error("Error en inicialización:", e);
    }
});

// ==========================================
// 3. LÓGICA INTERNA
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

        // Listeners Filtros
        document.querySelectorAll('#category-filters button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                applyFilters();
            });
        });

        // Listeners Búsqueda
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', applyFilters);
        
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
                    ${p.model_url ? '<span class="position-absolute bottom-0 end-0 m-2 badge bg-black border border-secondary">3D</span>' : ''}
                    ${isOut ? '<div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center text-white fw-bold">AGOTADO</div>' : ''}
                </div>
                <div class="card-body bg-black text-white border-top border-secondary">
                    <h5 class="text-truncate fw-bold">${p.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        ${priceHtml}
                        <button class="btn btn-outline-danger btn-sm rounded-circle p-2" onclick="event.stopPropagation(); addToCart(${p.id})"><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// UTILIDADES
function updateCartUI() {
    const el = document.getElementById('cart-count');
    if (el) {
        const q = cart.reduce((a,b) => a + b.quantity, 0);
        el.innerText = q;
        el.style.display = q > 0 ? 'block' : 'none';
    }
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
            body.innerHTML += `<div class="mb-2"><span class="bg-secondary text-white p-2 rounded">Contáctanos por WhatsApp para soporte.</span></div>`;
            body.scrollTop = body.scrollHeight;
        }, 1000);
    };

    if(send) send.onclick = sendMsg;
    if(input) input.onkeypress = (e) => { if(e.key === 'Enter') sendMsg(); };
}

// LOGIN Y REGISTRO (Simplificado para evitar errores)
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
    
    // Iniciar librería solo si existe
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
    // Implementación simple para evitar errores
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