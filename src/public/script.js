/**
 * SPEEDCOLLECT | SCRIPT MAESTRO (FINAL)
 * Fase 1: Stock Real, Paginación, 3D y Validaciones Bancarias
 */

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
    console.log("🚀 SpeedCollect System Online");
    
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

    // Botón Cargar Más (Creación dinámica)
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
        // Insertar después del contenedor
        if(container.parentNode) container.parentNode.appendChild(moreBtn);
    }
}

// FUNCIÓN MAESTRA DE CARGA (CORREGIDA)
async function loadCatalog(reset = false) {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
        currentPage = 0;
        if(container) container.innerHTML = '';
        allProducts = []; // Limpiar memoria para nueva búsqueda
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
        // Si es reset, reemplazamos. Si es cargar más, añadimos.
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

        if (p.discount) { // Viene del backend si hay venta nocturna activa
            priceHtml = `
                <div class="d-flex flex-column align-items-start">
                    <span class="old-price small">$${parseFloat(p.base_price).toLocaleString()}</span>
                    <span class="offer-price">$${price.toLocaleString()}</span>
                </div>`;
        }

        return `
        <div class="col-md-6 col-lg-4 mb-4 animate__animated animate__fadeIn">
            <div class="card custom-card h-100 shadow product-card" onclick="openModal(${p.id})">
                <div class="position-relative overflow-hidden" style="height: 250px;">
                    <img src="${img}" class="w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category}</div>
                    ${p.model_url ? '<div class="position-absolute bottom-0 end-0 m-2 badge bg-dark border border-white"><i class="fa-solid fa-cube"></i> 3D</div>' : ''}
                    ${isOut ? '<div class="overlay-sold d-flex align-items-center justify-content-center"><span>AGOTADO</span></div>' : ''}
                </div>
                <div class="card-body d-flex flex-column bg-black text-white">
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

// ==========================
// 2. CARRITO Y COMPRA (STOCK REAL)
// ==========================
window.addToCart = async function(id) {
    const token = localStorage.getItem('token');
    
    // VALIDACIÓN 1: Usuario no verificado/logueado
    if (!token) {
        if(confirm("🔒 Acceso Restringido.\nDebes registrarte o iniciar sesión para comprar.\n¿Ir al registro ahora?")) {
            window.location.href = 'register.html';
        }
        return;
    }

    // VALIDACIÓN 2: Stock (Consulta al backend)
    try {
        const res = await fetch(`${API_URL}/store/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productId: id, quantity: 1 })
        });
        const data = await res.json();

        if (res.ok) {
            alert(`✅ ${data.message}`);
            updateCartUI(); // Actualizar contador visual
        } else {
            alert(`⚠️ ${data.message}`); // Mensaje real de stock del backend
        }
    } catch (e) { alert("Error de conexión"); }
};

window.openPaymentModal = async function() {
    const token = localStorage.getItem('token');
    if(!token) return alert("Inicia sesión");
    
    try {
        const res = await fetch(`${API_URL}/store/cart`, { headers: {'Authorization':`Bearer ${token}`} });
        // Manejo de error 401
        if(res.status === 401) { window.logout(); return; }
        
        const data = await res.json();
        
        window.currentCartItems = data.items; // Guardar para PDF
        const list = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        
        if(data.items.length === 0) {
            list.innerHTML = '<p class="text-center text-muted">Garaje vacío.</p>';
        } else {
            list.innerHTML = data.items.map(i => `
                <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-1">
                    <div><span class="fw-bold text-white">${i.quantity}x</span> ${i.name}</div>
                    <span class="text-success fw-bold">$${(i.price*i.quantity).toLocaleString()}</span>
                </div>`).join('');
        }
        
        if(totalEl) totalEl.innerText = `$${parseFloat(data.total).toLocaleString()}`;
        new bootstrap.Modal(document.getElementById('paymentModal')).show();
    } catch(e) { alert("Error cargando carrito"); }
};

window.checkout = async function() {
    const token = localStorage.getItem('token');
    if(!token) return;
    if(!confirm("¿Confirmar compra y debitar de tu cuenta?")) return;

    try {
        const res = await fetch(`${API_URL}/store/checkout`, { method:'POST', headers:{'Authorization':`Bearer ${token}`} });
        const d = await res.json();
        
        if(res.ok) {
            generatePDF(window.currentCartItems, d.total, d.orderId);
            alert("¡COMPRA EXITOSA!");
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            loadCatalog(true); // Actualizar stock visual en catálogo
        } else alert("Error: " + d.message);
    } catch(e) { alert("Error en pago"); }
};

// ==========================
// 3. MODAL DETALLE (3D & IMAGEN)
// ==========================
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    currentProductModalId = id;
    
    let price = parseFloat(p.price);
    let htmlPrice = `<span class="text-danger fw-bold fs-2">$${price.toLocaleString()}</span>`;
    
    if (p.discount) {
        htmlPrice = `
            <div class="d-flex flex-column">
                <span class="text-decoration-line-through text-muted small">$${parseFloat(p.base_price).toLocaleString()}</span>
                <span class="text-success fw-bold fs-2">$${price.toLocaleString()}</span>
            </div>`;
    }

    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerHTML = htmlPrice;
    document.getElementById('modal-p-stock').innerHTML = p.stock > 0 ? `<span class="text-success">Disponible: ${p.stock}</span>` : '<span class="text-danger">Agotado</span>';

    // 3D o Imagen
    const visualContainer = document.getElementById('visual-container');
    if(visualContainer) {
        if (p.model_url && (p.model_url.endsWith('.glb') || p.model_url.endsWith('.gltf'))) {
            visualContainer.innerHTML = `
                <div class="ratio ratio-16x9 bg-black border border-secondary rounded overflow-hidden shadow">
                    <model-viewer 
                        src="${p.model_url}" 
                        alt="${p.name}" 
                        auto-rotate 
                        camera-controls 
                        shadow-intensity="1"
                        style="width: 100%; height: 100%; background-color: #151515;"
                    ></model-viewer>
                    <div class="position-absolute bottom-0 w-100 text-center small text-white-50 py-1">Rotar 360°</div>
                </div>`;
        } else {
            visualContainer.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded w-100">`;
        }
    }
    
    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
};

// ==========================
// 4. UTILIDADES & AUTH
// ==========================
async function updateCartUI() {
    const token = localStorage.getItem('token');
    const el = document.getElementById('cart-count');
    if(!token || !el) return;
    try {
        const res = await fetch(`${API_URL}/store/cart`, {headers:{'Authorization':`Bearer ${token}`}});
        if(res.status === 401) { window.logout(); return; }
        const d = await res.json();
        const c = d.items?.reduce((a,b)=>a+b.quantity,0) || 0;
        el.innerText = c; el.style.display = c > 0 ? 'block' : 'none';
    } catch(e) {}
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
    doc.text(`Cliente: ${user ? user.name : 'Cliente VIP'}`, 15, 60);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 70);
    
    // Calcular IVA
    const subtotal = parseFloat(total) / 1.19;
    const iva = parseFloat(total) - subtotal;

    const body = items.map(i => [i.quantity, i.name, `$${parseFloat(i.price).toLocaleString()}`, `$${(i.price*i.quantity).toLocaleString()}`]);
    doc.autoTable({ startY: 80, head: [['Cant', 'Auto', 'Unit', 'Total']], body: body });
    
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: $${subtotal.toLocaleString(undefined, {maximumFractionDigits:2})}`, 130, finalY);
    doc.text(`IVA (19%): $${iva.toLocaleString(undefined, {maximumFractionDigits:2})}`, 130, finalY + 10);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${parseFloat(total).toLocaleString()}`, 130, finalY + 20);
    
    doc.save(`Factura_${id}.pdf`);
}

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
        // Efecto visual
        const offers = document.getElementById('offers');
        if(offers) offers.style.border = "2px solid #00ff00";
    } catch(e){}
}

// BOT Y LOGIN
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
    if(pInput && window.intlTelInput) itiInstance = window.intlTelInput(pInput, { utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js", initialCountry: "auto", geoIpLookup: cb => fetch("https://ipapi.co/json").then(r=>r.json()).then(d=>cb(d.country_code)).catch(()=>cb("co")) });

    if(f) f.addEventListener('submit', async e => {
        e.preventDefault();
        const pass = document.getElementById('reg-pass').value;
        const msg = document.getElementById('global-msg') || document.createElement('div');
        if(pass.length < 8) return alert("Contraseña insegura (min 8 chars)");
        
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
            if(res.ok) { alert(d.message); window.location.href='login.html'; }
            else alert(d.message);
        } catch(err) { alert("Error servidor"); }
    });
}

function initLogin() {
    const f = document.getElementById('login-form');
    if(f) f.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-pass').value
                })
            });
            const d = await res.json();
            if(res.ok) {
                localStorage.setItem('token', d.token);
                localStorage.setItem('user', JSON.stringify(d.user));
                window.location.href='index.html';
            } else alert(d.message);
        } catch(err) { alert("Error conexión"); }
    });
}

function checkAuthStatus() { 
    const u = localStorage.getItem('user');
    if(u) {
        const user = JSON.parse(u);
        const div = document.getElementById('auth-section');
        if(div) div.innerHTML = `<button onclick="logout()" class="btn btn-outline-light btn-sm">SALIR</button>`;
        if(user.role==='admin' && document.getElementById('admin-crown')) document.getElementById('admin-crown').style.display='block';
    }
}
window.logout = function() { localStorage.clear(); window.location.href='index.html'; };

async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    if(c) {
        try {
            const res = await fetch(`${API_URL}/products/${pid}/reviews`);
            const d = await res.json();
            c.innerHTML = d.length ? d.map(r => `<div class="small mb-2 text-white border-bottom border-secondary pb-1"><strong>${r.user_name}</strong>: ${r.comment}</div>`).join('') : '<small class="text-muted">Sin reseñas.</small>';
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