const API_URL = '/api'; 
let currentProductModalId = null;
let isOfferActive = false;
let currentPage = 0;
const ITEMS_PER_PAGE = 10;
const ADMIN_EMAIL = "jsusgamep@itc.edu.co"; 

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();
    initChatbot();

    const container = document.getElementById('products-container');
    if (container) {
        setupStoreListeners();
        loadCatalog(true);
        startCountdown();
    }
    
    if (document.getElementById('register-form')) initStrictRegister();
    if (document.getElementById('login-form')) initLogin();
    if (document.getElementById('reviewForm')) document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
});

// ==========================
// 1. CATÁLOGO
// ==========================
function setupStoreListeners() {
    // Filtros
    document.querySelectorAll('#category-filters button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadCatalog(true);
        });
    });
    // Buscador Texto
    const sInput = document.getElementById('search-input');
    if(sInput) sInput.addEventListener('input', () => loadCatalog(true));
    // Filtro Precio
    const pRange = document.getElementById('price-range');
    if(pRange) pRange.addEventListener('change', () => loadCatalog(true));
    
    // Botón Cargar Más
    const moreBtn = document.createElement('button');
    moreBtn.id = 'load-more-btn';
    moreBtn.className = 'btn btn-outline-light d-block mx-auto mt-4';
    moreBtn.innerText = 'CARGAR MÁS';
    moreBtn.onclick = () => { currentPage++; loadCatalog(false); };
    document.getElementById('products-container').parentNode.appendChild(moreBtn);
}

async function loadCatalog(reset = false) {
    if (reset) { currentPage = 0; document.getElementById('products-container').innerHTML = ''; }
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'block';

    try {
        const cat = document.querySelector('#category-filters button.active')?.dataset.filter || 'all';
        const txt = document.getElementById('search-input')?.value || '';
        const prc = document.getElementById('price-range')?.value || 1000000;

        let url = `${API_URL}/store/products?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`;
        if(cat !== 'all') url += `&category=${cat}`;
        if(prc) url += `&maxPrice=${prc}`;
        
        if (txt.length === 1) url += `&initial=${txt}`;
        else if (txt.length > 1) url += `&search=${txt}`;

        const res = await fetch(url);
        const products = await res.json();
        
        if(loader) loader.style.display = 'none';

        if (products.length === 0 && currentPage === 0) {
            document.getElementById('products-container').innerHTML = '<div class="text-center text-muted py-5">No se encontraron autos.</div>';
            return;
        }

        renderProducts(products);
        
        const btn = document.getElementById('load-more-btn');
        if(btn) btn.style.display = products.length < ITEMS_PER_PAGE ? 'none' : 'block';

    } catch (e) { console.error(e); }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    const html = products.map(p => {
        const isOut = p.stock <= 0;
        let price = `<span class="fs-5 fw-bold">$${parseFloat(p.price).toLocaleString()}</span>`;
        if (p.discount) price = `<span class="text-decoration-line-through small text-muted">$${parseFloat(p.base_price).toLocaleString()}</span> <span class="text-success fw-bold">${price}</span>`;

        return `
        <div class="col-md-6 col-lg-4 mb-4 animate__animated animate__fadeIn">
            <div class="card bg-black border-secondary h-100 shadow product-card" onclick="openModal(${p.id})">
                <div class="position-relative overflow-hidden" style="height:250px;">
                    <img src="${p.image_url}" class="w-100 h-100 object-fit-cover" alt="${p.name}">
                    ${p.model_url ? '<span class="position-absolute bottom-0 end-0 m-2 badge bg-dark border">3D</span>' : ''}
                    ${isOut ? '<div class="position-absolute w-100 h-100 bg-black bg-opacity-75 d-flex align-items-center justify-content-center text-danger fw-bold">AGOTADO</div>' : ''}
                </div>
                <div class="card-body text-white">
                    <h5 class="fw-bold text-truncate">${p.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        ${price}
                        <button class="btn btn-outline-danger btn-sm rounded-circle" onclick="event.stopPropagation(); addToCart(${p.id})"><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
    container.insertAdjacentHTML('beforeend', html);
}

// ==========================
// 2. CARRITO Y COMPRA
// ==========================
window.addToCart = async function(id) {
    const token = localStorage.getItem('token');
    if (!token) {
        if(confirm("🔒 Debes iniciar sesión para reservar stock. ¿Ir al login?")) window.location.href='login.html';
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
    if(!token) return alert("Inicia sesión");
    
    try {
        const res = await fetch(`${API_URL}/store/cart`, { headers: {'Authorization':`Bearer ${token}`} });
        const data = await res.json();
        
        window.currentCartItems = data.items;
        const list = document.getElementById('cart-items');
        
        if(data.items.length === 0) list.innerHTML = '<p class="text-center text-muted">Garaje vacío.</p>';
        else {
            list.innerHTML = data.items.map(i => `
                <div class="d-flex justify-content-between mb-2 border-bottom border-secondary pb-1">
                    <span>${i.quantity}x ${i.name}</span>
                    <span class="text-success fw-bold">$${(i.price*i.quantity).toFixed(2)}</span>
                </div>`).join('');
        }
        document.getElementById('cart-total').innerText = `$${parseFloat(data.total).toFixed(2)}`;
        new bootstrap.Modal(document.getElementById('paymentModal')).show();
    } catch(e) { alert("Error cargando carrito"); }
};

window.checkout = async function() {
    const token = localStorage.getItem('token');
    if(!token) return;
    if(!confirm("¿Confirmar compra?")) return;

    try {
        const res = await fetch(`${API_URL}/store/checkout`, { method:'POST', headers:{'Authorization':`Bearer ${token}`} });
        const d = await res.json();
        
        if(res.ok) {
            generatePDF(window.currentCartItems, d.total, d.orderId);
            alert("¡COMPRA EXITOSA!");
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            loadCatalog(true); // Actualizar stock visual
        } else alert("Error: " + d.message);
    } catch(e) { alert("Error en pago"); }
};

// ==========================
// 3. UTILIDADES
// ==========================
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
    doc.text("RECIBO SPEEDCOLLECT", 20, 20);
    doc.text(`Orden: ${id}`, 20, 30);
    const body = items.map(i => [i.quantity, i.name, `$${i.price}`, `$${(i.price*i.quantity).toFixed(2)}`]);
    doc.autoTable({ startY: 40, head: [['Cant', 'Auto', 'Unit', 'Total']], body: body });
    doc.text(`TOTAL: $${parseFloat(total).toFixed(2)}`, 140, doc.lastAutoTable.finalY+20);
    doc.save(`Recibo_${id}.pdf`);
}

function startCountdown() {
    let t = 600;
    setInterval(() => {
        if(t <= 0) { if(!isOfferActive) activateNightSale(); return; }
        t--;
        const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
        const el = document.getElementById('hours');
        if(el) {
            el.innerText = h<10?'0'+h:h; 
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
        alert("🌙 VENTA NOCTURNA INICIADA");
        loadCatalog(true);
    } catch(e){}
}

// MODAL, CHAT, LOGIN... (Funciones visuales estándar)
window.openModal = async function(id) {
    // Para simplificar, buscamos en el DOM o recargamos. 
    // Como tenemos datos en backend, lo ideal es un fetch single product, pero usaremos un truco visual por ahora.
    // ... Implementación básica modal ...
    alert("Función modal pendiente de conectar a endpoint single product.");
    // (Nota: Si quieres el modal completo, necesitas endpoint getProductById en backend)
};

function initChatbot() { /* ... Código chat previo ... */ }
function initStrictRegister() { /* ... Código registro previo ... */ }
function initLogin() { /* ... Código login previo ... */ }
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