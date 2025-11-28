const API_URL = '/api'; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;

const { jsPDF } = window.jspdf || {};

// REGLAS ESTRICTAS DE TELÉFONO
const PHONE_RULES = [
    { country: "Colombia", prefix: "3", digits: 10, flag: "🇨🇴" },
    { country: "México", prefix: "55", digits: 10, flag: "🇲🇽" },
    { country: "USA", prefix: "1", digits: 10, flag: "🇺🇸" }
];

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();

    // Detección de página
    if (document.getElementById('products-container')) initStore();
    if (document.getElementById('register-form')) initRegisterStrict();
    if (document.getElementById('login-form')) initLogin();
    if (document.getElementById('admin-products-list')) loadAdminProducts();

    // Listeners Globales
    const reviewForm = document.getElementById('reviewForm');
    if(reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);
});

// ==========================================
// 1. TIENDA Y 3D (Corrección de No Image)
// ==========================================
async function initStore() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');

    try {
        const res = await fetch(`${API_URL}/store/products`);
        allProducts = await res.json();
        
        loader.classList.add('d-none');
        container.classList.remove('d-none');
        renderProducts(allProducts);

        // Filtros
        document.querySelectorAll('#category-filters button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cat = e.target.dataset.filter;
                const filtered = cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat);
                renderProducts(filtered);
            });
        });
    } catch (e) {
        loader.innerHTML = '<h3 class="text-danger">Error conectando al servidor.</h3>';
    }
}

function renderProducts(list) {
    const container = document.getElementById('products-container');
    if (list.length === 0) {
        container.innerHTML = '<div class="text-center text-muted w-100 mt-5">No hay productos.</div>';
        return;
    }

    container.innerHTML = list.map(p => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card bg-dark text-white border-secondary h-100 shadow product-card">
                <div class="position-relative" style="height: 250px; overflow: hidden;">
                    <img src="${p.image_url}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3">${p.category}</div>
                </div>
                <div class="card-body">
                    <h5 class="fw-bold text-truncate">${p.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-danger fs-4 fw-bold">$${p.price}</span>
                        <div>
                            <button onclick="openModal(${p.id})" class="btn btn-outline-light btn-sm"><i class="fa-solid fa-cube"></i> Ver 3D</button>
                            <button onclick="addToCart(${p.id})" class="btn btn-danger btn-sm"><i class="fa-solid fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// 2. MODAL 3D Y RESEÑAS
// ==========================================
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    
    currentProductModalId = id;
    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerText = `$${p.price}`;
    document.getElementById('modal-p-stock').innerText = `Stock: ${p.stock}`;
    document.getElementById('modal-p-id').value = p.id;

    // LÓGICA 3D: Si hay URL de modelo, poner Iframe. Si no, Imagen.
    const visual = document.getElementById('modal-p-img').parentNode;
    if(p.model_url && p.model_url.includes('sketchfab')) {
        visual.innerHTML = `<div class="ratio ratio-16x9 border border-secondary rounded"><iframe src="${p.model_url}" allow="autoplay; fullscreen; xr-spatial-tracking" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe></div>`;
    } else {
        visual.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded border border-secondary">`;
    }

    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    c.innerHTML = '<small class="text-muted">Cargando opiniones...</small>';
    const res = await fetch(`${API_URL}/products/${pid}/reviews`);
    const reviews = await res.json();
    
    if(reviews.length === 0) {
        c.innerHTML = '<small class="text-muted">Sé el primero en opinar.</small>';
        return;
    }
    c.innerHTML = reviews.map(r => `
        <div class="border-bottom border-secondary py-2">
            <div class="d-flex justify-content-between">
                <strong class="text-danger small">${r.user_name}</strong>
                <span class="text-warning small">${'★'.repeat(r.rating)}</span>
            </div>
            <p class="text-light small mb-0">${r.comment}</p>
        </div>
    `).join('');
}

// RESEÑA INSTANTÁNEA (Sin recargar)
async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if(!token) return alert("Inicia sesión para opinar.");

    const comment = document.getElementById('review-comment').value;
    const rating = document.getElementById('review-rating').value;

    const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ productId: currentProductModalId, rating, comment })
    });

    if(res.ok) {
        // INYECCIÓN MANUAL E INSTANTÁNEA
        const c = document.getElementById('reviewsContainer');
        const newHtml = `
            <div class="border-bottom border-secondary py-2 bg-dark p-2 rounded mb-2">
                <div class="d-flex justify-content-between">
                    <strong class="text-danger small">${user.name}</strong>
                    <span class="text-warning small">${'★'.repeat(rating)}</span>
                </div>
                <p class="text-light small mb-0">${comment}</p>
            </div>
        `;
        // Si decía "Se el primero", lo borramos
        if(c.innerHTML.includes('Sé el primero')) c.innerHTML = '';
        c.insertAdjacentHTML('afterbegin', newHtml); // Poner al principio
        document.getElementById('review-comment').value = ''; // Limpiar
    } else {
        alert("Error guardando reseña.");
    }
}

// ==========================================
// 3. REGISTRO ESTRICTO (Tus validaciones)
// ==========================================
function initRegisterStrict() {
    const form = document.getElementById('register-form');
    const phoneIn = document.getElementById('reg-phone');
    const msg = document.getElementById('msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.innerHTML = '';

        // 1. Validar Nombre (No repetidos, max 3 palabras)
        const name = document.getElementById('reg-name').value.trim();
        const words = name.split(' ');
        if(words.length > 3 || words.length < 1) return alert("Nombre inválido (Máx 3 palabras).");
        if(new Set(words).size !== words.length) return alert("No repitas nombres.");
        if(/(.)\1\1/.test(name)) return alert("Caracteres repetidos sospechosos.");

        // 2. Validar Teléfono (Colombia empieza por 3)
        const phone = phoneIn.value.replace(/\D/g, '');
        if(phone.length !== 10) return alert("El teléfono debe tener 10 dígitos exactos.");
        // Regla Colombia: Si empieza por 3
        if(!phone.startsWith('3') && !phone.startsWith('5')) return alert("Número inválido para la región.");

        // 3. Password
        const pass = document.getElementById('reg-pass').value;
        if(pass.length < 10) return alert("Contraseña muy corta (Mín 10).");
        if(!/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) return alert("Faltan mayúsculas o números.");

        // Enviar
        msg.innerHTML = 'Registrando...';
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    name, 
                    email: document.getElementById('reg-email').value, 
                    password: pass, 
                    phone 
                })
            });
            const data = await res.json();
            if(res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                msg.innerHTML = `<span class="text-danger">${data.message}</span>`;
            }
        } catch(err) { alert("Error de servidor"); }
    });
}

// ==========================================
// 4. CARRITO Y PAGO (PDF)
// ==========================================
window.addToCart = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(p) {
        const item = cart.find(i => i.id === id);
        if(item) item.quantity++; else cart.push({...p, quantity:1});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        alert("Agregado al carrito"); // Feedback
    }
}

function updateCartUI() {
    const c = document.getElementById('cart-count');
    if(c) c.innerText = cart.reduce((a,b)=>a+b.quantity,0);
}

window.openPaymentModal = function() {
    if(cart.length === 0) return alert("Carrito vacío");
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = cart.map(i => {
        total += i.price * i.quantity;
        return `<li class="d-flex justify-content-between bg-dark text-white p-2 mb-1 border-bottom border-secondary">
            <span>${i.quantity}x ${i.name}</span>
            <span>$${i.price * i.quantity}</span>
        </li>`;
    }).join('');
    document.getElementById('cart-total').innerText = `$${total}`;
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}

window.checkout = function() {
    // Generar PDF
    const doc = new window.jspdf.jsPDF();
    doc.text("RECIBO SPEEDCOLLECT", 10, 10);
    let y = 20;
    cart.forEach(i => {
        doc.text(`${i.quantity}x ${i.name} - $${i.price * i.quantity}`, 10, y);
        y += 10;
    });
    doc.text(`TOTAL: ${document.getElementById('cart-total').innerText}`, 10, y + 10);
    doc.save("recibo.pdf");
    
    alert("Pago Exitoso. Recibo descargado.");
    cart = [];
    localStorage.removeItem('cart');
    location.reload();
}

// AUTH CHECK Y LOGOUT
function checkAuthStatus() {
    const u = JSON.parse(localStorage.getItem('user'));
    const div = document.getElementById('auth-section');
    if(div && u) {
        let adminHtml = u.role === 'admin' ? '<a href="admin.html" class="dropdown-item text-warning">Admin Panel</a>' : '';
        div.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light btn-sm dropdown-toggle" data-bs-toggle="dropdown">${u.name}</button>
                <ul class="dropdown-menu dropdown-menu-dark">
                    ${adminHtml}
                    <li><button onclick="localStorage.clear();location.href='index.html'" class="dropdown-item">Salir</button></li>
                </ul>
            </div>`;
        const f = document.getElementById('review-form-container');
        if(f) f.classList.remove('d-none');
    }
}

function initLogin() {
    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/auth/login`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value})
        });
        const d = await res.json();
        if(res.ok) {
            localStorage.setItem('token', d.token);
            localStorage.setItem('user', JSON.stringify(d.user));
            window.location.href = d.user.role === 'admin' ? 'admin.html' : 'index.html';
        } else alert(d.message);
    });
}