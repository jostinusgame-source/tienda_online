/**
 * SPEEDCOLLECT | SCRIPT MAESTRO
 * Fase 1: Stock Real, Paginación y Validaciones Bancarias
 */

const API_URL = '/api'; 
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
    const searchInput = document.getElementById('search-input');
    let timeout = null;
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => loadCatalog(true), 500);
        });
    }

    // Filtro Precio
    const priceRange = document.getElementById('price-range');
    const priceVal = document.getElementById('price-val');
    if(priceRange) {
        priceRange.addEventListener('input', (e) => {
            if(priceVal) priceVal.innerText = `$${e.target.value}`;
        });
        priceRange.addEventListener('change', () => loadCatalog(true)); // Cargar al soltar
    }

    // Botón Cargar Más
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'load-more-btn';
    loadMoreBtn.className = 'btn btn-outline-light px-5 py-2 rounded-0 fw-bold mt-4 d-none';
    loadMoreBtn.innerText = 'CARGAR MÁS MODELOS';
    loadMoreBtn.onclick = () => {
        currentPage++;
        loadCatalog(false); // No resetear, añadir al final
    };
    // Insertar botón después del container
    const container = document.getElementById('products-container');
    container.parentNode.appendChild(loadMoreBtn); // Agregar al final de la sección
}

// FUNCIÓN MAESTRA DE CARGA
async function loadCatalog(reset = false) {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
        currentPage = 0;
        container.innerHTML = '';
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
        const products = await res.json();

        if(loader) loader.style.display = 'none';

        if (products.length === 0 && currentPage === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3>No se encontraron vehículos en el radar.</h3></div>';
            if(loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        renderProducts(products);

        // Controlar botón "Cargar Más"
        if (loadMoreBtn) {
            loadMoreBtn.style.display = products.length < ITEMS_PER_PAGE ? 'none' : 'inline-block';
        }

    } catch (e) {
        console.error(e);
        if(loader) loader.innerHTML = '<p class="text-danger">Error de conexión.</p>';
    }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    
    const html = products.map(p => {
        const isOut = p.stock <= 0;
        const img = p.image_url || 'https://via.placeholder.com/400';
        
        // Manejo de Precio (Normal vs Oferta)
        let price = parseFloat(p.price);
        let priceHtml = `<span class="fs-4 fw-bold text-white">$${price.toLocaleString()}</span>`;

        if (p.discount_applied) { // Viene del backend si hay venta nocturna
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
                    <img src="${img}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category}</div>
                    ${p.model_url ? '<div class="position-absolute bottom-0 end-0 m-2 badge bg-dark border border-light"><i class="fa-solid fa-cube"></i> 3D</div>' : ''}
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

// ==========================================
// 3. CARRITO Y STOCK (LÓGICA SEGURA)
// ==========================================

// ACTUALIZAR CONTADOR (Backend)
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

// AÑADIR A CARRITO (RESERVAR)
window.addToCart = async function(id) {
    const token = localStorage.getItem('token');
    
    // 1. Validación de Sesión
    if (!token) {
        if(confirm("🔒 Acceso Restringido. Debes iniciar sesión para reservar. ¿Ir al login?")) {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        // 2. Petición al Backend (Valida stock y crea reserva)
        const res = await fetch(`${API_URL}/store/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productId: id, quantity: 1 })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`✅ ${data.message}`);
            updateCartUI(); 
        } else {
            // 3. Manejo de Errores (Stock, Límite, etc)
            alert(`⚠️ ${data.message}`);
        }
    } catch (e) {
        alert("Error de conexión con el servidor.");
    }
};

// ABRIR MODAL PAGO
window.openPaymentModal = async function() {
    const token = localStorage.getItem('token');
    if (!token) return new bootstrap.Modal(document.getElementById('loginRequiredModal')).show();
    
    try {
        const res = await fetch(`${API_URL}/store/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        const list = document.getElementById('cart-items');
        
        // Guardar para PDF
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
        
        document.getElementById('cart-total').innerText = `$${parseFloat(data.total).toFixed(2)}`;
        new bootstrap.Modal(document.getElementById('paymentModal')).show();

    } catch (e) {
        alert("No se pudo cargar el carrito.");
    }
};

// CHECKOUT (PDF + DB)
window.checkout = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm("¿Confirmar compra y procesar factura?")) return;

    try {
        const res = await fetch(`${API_URL}/store/checkout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            // Generar PDF
            generatePDF(window.currentCartItems, data.total, data.orderId);
            
            alert("¡COMPRA EXITOSA! Revisa tu carpeta de descargas.");
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            
            // Recargar catálogo para actualizar stocks visualmente
            loadCatalog(true);
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (e) {
        alert("Error procesando pago.");
    }
};

// ==========================================
// 4. MODAL DETALLE (3D & IMAGEN)
// ==========================================
window.openModal = async function(id) {
    // Buscar producto en la página actual (o hacer fetch específico si prefieres)
    // Para simplificar, hacemos fetch para tener datos frescos (como stock)
    try {
        // Nota: Idealmente crearías un endpoint /store/products/:id, pero usaremos lógica frontend por ahora
        // Si tienes el array allProducts, búscalo ahí, pero el stock podría estar viejo.
        // Simularemos con los datos actuales de la vista.
        
        // Solución robusta: Volver a pedir datos de 1 producto (Opcional, si tienes el endpoint)
        // Por ahora usamos los datos cargados en memoria que vienen de loadCatalog
        
        // Buscar el elemento en el DOM para sacar la info visual si no está en memoria
        // ... (Para simplificar, asumiremos que está en allProducts del catálogo) ...
        
        // Mejor enfoque: Hacer que loadCatalog guarde en window.currentProducts
        // (Agregué `allProducts = [...allProducts, ...newProducts]` en loadCatalog arriba, pero
        // para asegurar integridad, usaremos fetch si es necesario o el array global).
        
        // Como 'allProducts' se llena en loadCatalog (linea ~100 de loadCatalog en mi mente), lo usamos.
        // Pero espera, en loadCatalog no guardé en variable global en este script.
        // CORRECCIÓN: Vamos a guardar los productos cargados en una variable global.
        
        // (Nota: En la función loadCatalog que te di arriba, no guardé en global array. 
        //  Voy a asumir que el usuario hace click en lo que ve).
        
        // Truco: Leer del array global (que definí al inicio `let allProducts = []` pero no llené en loadCatalog).
        // Voy a arreglar loadCatalog ahora mismo en este script final.
    } catch(e){}
    
    // --- IMPORTANTE: Recuperar producto del array global (que llenaremos abajo)
    // Ver corrección en loadCatalog
};

// RE-IMPLEMENTACIÓN OPENMODAL CON DATOS
// Nota: Necesitamos que loadCatalog llene `window.catalogProducts`.
window.catalogProducts = []; // Array global temporal

// SOBREESCRIBIR loadCatalog para llenar el array (Mejora técnica)
// (Ya incluido arriba, pero asegúrate de que loadCatalog haga: window.catalogProducts = ... o similar)
// En el código de arriba, loadCatalog renderiza directo. Vamos a ajustarlo para guardar datos.

// ********* CORRECCIÓN EN loadCatalog (Línea ~95) **********
// En loadCatalog, donde dice "const newProducts = ...", agrega:
// if(reset) window.catalogProducts = [];
// window.catalogProducts = [...window.catalogProducts, ...newProducts];
// **********************************************************

// Funcion OpenModal Real
window.openModal = function(id) {
    // Buscar en los productos cargados
    // Nota: Como no tengo el código de loadCatalog con la variable global en el bloque anterior,
    // voy a hacer un fetch rápido para asegurar datos frescos. Es más seguro.
    
    // FETCH INDIVIDUAL (Mejor práctica para stock real)
    // Pero como no tienes el endpoint individual implementado en el controller que te di,
    // usaremos el truco de buscar en la variable global.
    
    // ASUMO que agregaste la línea en loadCatalog. Si no, esto fallará.
    // Para evitar fallos, aquí va la lógica segura:
    
    // Intentar buscar en el DOM o memoria
    // ...
    // OK, para no complicarte: Voy a modificar loadCatalog en este script para que guarde los datos.
    
    // (Ver abajo función loadCatalog corregida dentro de este mismo script)
    
    const p = window.catalogProducts ? window.catalogProducts.find(x => x.id === id) : null;
    if (!p) return;
    
    currentProductModalId = id;
    
    let htmlPrice = `<span class="text-danger fw-bold fs-2">$${parseFloat(p.price).toLocaleString()}</span>`;
    
    // Datos Texto
    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerHTML = htmlPrice;
    document.getElementById('modal-p-stock').innerHTML = p.stock > 0 ? `<span class="text-success">Disponible: ${p.stock}</span>` : '<span class="text-danger">Agotado</span>';

    // 3D / Imagen
    const visualContainer = document.getElementById('visual-container');
    if (p.model_url && (p.model_url.endsWith('.glb') || p.model_url.endsWith('.gltf'))) {
        visualContainer.innerHTML = `<div class="ratio ratio-16x9 bg-black rounded shadow"><model-viewer src="${p.model_url}" alt="${p.name}" auto-rotate camera-controls shadow-intensity="1" style="width:100%;height:100%"></model-viewer></div>`;
    } else {
        visualContainer.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded w-100">`;
    }
    
    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
};

// ==========================================
// 5. UTILIDADES Y AUTH
// ==========================================

function checkAuthStatus() {
    const uStr = localStorage.getItem('user');
    if (!uStr) return;
    try {
        const u = JSON.parse(uStr);
        const div = document.getElementById('auth-section');
        if (div && u) {
            if (document.getElementById('admin-crown') && u.email === ADMIN_EMAIL) {
                document.getElementById('admin-crown').style.display = 'block';
            }
            div.innerHTML = `<button onclick="logout()" class="btn btn-outline-light btn-sm fw-bold border-0">SALIR</button>`;
        }
    } catch(e) {}
}

window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

function generatePDF(items, total, orderId) {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    
    doc.text("RECIBO SPEEDCOLLECT", 20, 20);
    doc.text(`Orden: ${orderId}`, 20, 30);
    doc.text(`Cliente: ${user.name}`, 20, 40);
    
    const body = items.map(i => [i.quantity, i.name, `$${i.price}`, `$${(i.price*i.quantity).toFixed(2)}`]);
    doc.autoTable({ startY: 50, head: [['Cant', 'Item', 'Unit', 'Total']], body: body });
    
    doc.text(`TOTAL + IVA: $${parseFloat(total).toFixed(2)}`, 140, doc.lastAutoTable.finalY + 20);
    doc.save(`Recibo_${orderId}.pdf`);
}

// VENTA NOCTURNA
function startCountdown() {
    let time = 600;
    setInterval(() => {
        if(time <= 0) { 
            if(!isOfferActive) activateNightSale(); 
            return; 
        }
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

async function activateNightSale() {
    isOfferActive = true;
    try {
        // Activar en backend
        await fetch(`${API_URL}/store/toggle-night-sale`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ active: true })
        });
        alert("🌙 VENTA NOCTURNA: Precios actualizados.");
        loadCatalog(true); // Recargar precios visuales
    } catch(e) {}
}

// RESEÑAS
async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    if(!c) return;
    try {
        const res = await fetch(`${API_URL}/products/${pid}/reviews`);
        const d = await res.json();
        c.innerHTML = d.length ? d.map(r => `<div class="small mb-2 text-white border-bottom border-secondary"><strong>${r.user_name}</strong>: ${r.comment}</div>`).join('') : '<small class="text-muted">Sin reseñas.</small>';
    } catch(e) {}
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

// CHATBOT
function initChatbot() {
    const t = document.getElementById('chatTrigger'), w = document.getElementById('chatWidget'), c = document.getElementById('closeChat'), s = document.getElementById('sendChat'), i = document.getElementById('chatInput'), b = document.getElementById('chatBody');
    if(!t) return;
    t.onclick = () => { w.style.display='flex'; t.style.display='none'; };
    c.onclick = () => { w.style.display='none'; t.style.display='flex'; };
    const send = () => {
        if(!i.value.trim()) return;
        b.innerHTML += `<div class="mb-2 text-end"><span class="bg-danger text-white p-2 rounded">${i.value}</span></div>`;
        i.value=''; b.scrollTop=b.scrollHeight;
        setTimeout(()=> { b.innerHTML+=`<div class="mb-2"><span class="bg-secondary text-white p-2 rounded">Para precios y stock, revisa el catálogo.</span></div>`; b.scrollTop=b.scrollHeight; }, 1000);
    };
    if(s) s.onclick = send;
    if(i) i.onkeypress = (e) => { if(e.key==='Enter') send(); };
}

// LOGIN Y REGISTER (CONECTADOS)
function initStrictRegister() {
    const f = document.getElementById('register-form');
    const pInput = document.getElementById('reg-phone');
    if(pInput && window.intlTelInput) itiInstance = window.intlTelInput(pInput, { utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js", initialCountry: "auto", geoIpLookup: cb => fetch("https://ipapi.co/json").then(r=>r.json()).then(d=>cb(d.country_code)).catch(()=>cb("co")) });

    if(f) f.addEventListener('submit', async e => {
        e.preventDefault();
        const pass = document.getElementById('reg-pass').value;
        if(pass.length < 8) return alert("Contraseña insegura.");
        
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

// --- ACTUALIZACIÓN loadCatalog PARA GLOBAL ARRAY ---
// Esta función reemplaza la versión anterior para guardar en memoria
// los productos y que el modal pueda abrirlos.
async function loadCatalog(reset = false) {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (reset) {
        currentPage = 0;
        container.innerHTML = '';
        window.catalogProducts = []; // Reset memoria
    }

    if(loader) loader.style.display = 'block';

    try {
        const activeCat = document.querySelector('#category-filters button.active');
        const category = activeCat ? activeCat.dataset.filter : 'all';
        const searchText = document.getElementById('search-input')?.value || '';
        const maxPrice = document.getElementById('price-range')?.value || 1000000;

        let url = `${API_URL}/store/products?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`;
        if (category !== 'all') url += `&category=${category}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;
        if (searchText.length === 1) url += `&initial=${searchText}`;
        else if (searchText.length > 1) url += `&search=${searchText}`;

        const res = await fetch(url);
        const products = await res.json();

        if(loader) loader.style.display = 'none';

        // Guardar en variable global para que openModal funcione
        if(reset) window.catalogProducts = products;
        else window.catalogProducts = [...window.catalogProducts, ...products];

        if (products.length === 0 && currentPage === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3>No se encontraron vehículos.</h3></div>';
            if(loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        renderProducts(products);

        if (loadMoreBtn) {
            loadMoreBtn.style.display = products.length < ITEMS_PER_PAGE ? 'none' : 'inline-block';
        }

    } catch (e) {
        if(loader) loader.innerHTML = '<p class="text-danger">Error de conexión.</p>';
    }
}