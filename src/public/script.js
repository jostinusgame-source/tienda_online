const API_URL = '/api'; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;

// TUS REGLAS DE PAÍSES EXACTAS
const COUNTRY_RULES = [
    { name: "Colombia", code: "+57", len: 10, flag: "🇨🇴", regex: /^3\d{9}$/ }, // Inicia con 3
    { name: "México", code: "+52", len: 10, flag: "🇲🇽", regex: /^[358]\d{9}$/ },
    { name: "USA", code: "+1", len: 10, flag: "🇺🇸", regex: /^\d{10}$/ },
    { name: "España", code: "+34", len: 9, flag: "🇪🇸", regex: /^[67]\d{8}$/ },
    { name: "Argentina", code: "+54", len: 10, flag: "🇦🇷", regex: /^\d{10,11}$/ }
];

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();

    // Cargar Catálogo si estamos en la tienda
    if (document.getElementById('products-container')) initStore();
    
    // Activar Validaciones si estamos en Registro
    if (document.getElementById('register-form')) initRegisterStrict();
    
    // Activar Login
    if (document.getElementById('login-form')) initLogin();
});

// ==========================================
// 1. CARGA DEL CATÁLOGO (Fix 404 y No Image)
// ==========================================
async function initStore() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');

    try {
        const res = await fetch(`${API_URL}/store/products`); // Ruta corregida
        if (!res.ok) throw new Error("Error cargando productos");
        
        allProducts = await res.json();
        loader.classList.add('d-none');
        container.classList.remove('d-none');
        
        renderProducts('all');

        // Filtros
        document.querySelectorAll('#category-filters button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.btn-group .active').classList.remove('active');
                e.target.classList.add('active');
                renderProducts(e.target.dataset.filter);
            });
        });

    } catch (error) {
        loader.innerHTML = '<h3 class="text-danger">Error de conexión. Verifica que el servidor esté corriendo.</h3>';
        console.error(error);
    }
}

function renderProducts(filter) {
    const container = document.getElementById('products-container');
    const list = filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter);

    if (list.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted"><h3>No hay items.</h3></div>';
        return;
    }

    container.innerHTML = list.map(p => {
        const price = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        // Si no hay imagen, usar placeholder elegante
        const img = p.image_url && p.image_url.length > 10 ? p.image_url : 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=600';
        
        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card bg-dark text-white border-secondary h-100 shadow product-card">
                <div class="position-relative" style="height: 250px; overflow: hidden;">
                    <img src="${img}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3">${p.category}</div>
                </div>
                <div class="card-body">
                    <h5 class="fw-bold text-truncate">${p.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-danger fs-4 fw-bold">${price}</span>
                        <div>
                            <button onclick="openModal(${p.id})" class="btn btn-outline-light btn-sm"><i class="fa fa-cube"></i> Ver 3D</button>
                            <button onclick="addToCart(${p.id})" class="btn btn-danger btn-sm"><i class="fa fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 2. MODAL CON SKETCHFAB (3D REAL)
// ==========================================
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    
    currentProductModalId = id;
    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerText = `$${p.price} USD`;
    document.getElementById('modal-p-stock').innerText = `Stock: ${p.stock}`;

    const visualContainer = document.getElementById('modal-p-img').parentElement;
    
    // LÓGICA: Si tiene link de Sketchfab, ponemos Iframe. Si no, Imagen.
    if(p.model_url && p.model_url.includes('sketchfab')) {
        visualContainer.innerHTML = `
            <div class="ratio ratio-16x9 border border-secondary rounded">
                <iframe title="${p.name}" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" src="${p.model_url}/embed?autostart=1&ui_theme=dark"></iframe>
            </div>
            <p class="text-center text-muted small mt-2"><i class="fa fa-rotate"></i> Gira el modelo con tu mouse</p>`;
    } else {
        visualContainer.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded border border-secondary">`;
    }

    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

// ==========================================
// 3. VALIDACIÓN ESTRICTA (REGISTRO)
// ==========================================
function initRegisterStrict() {
    const form = document.getElementById('register-form');
    const nameIn = document.getElementById('reg-name');
    const phoneIn = document.getElementById('reg-phone');
    const passIn = document.getElementById('reg-pass');
    const msg = document.getElementById('msg');

    // Validación automática de teléfono al escribir
    phoneIn.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, ''); // Solo números
        let detected = COUNTRY_RULES.find(c => val.startsWith(c.code.replace('+','')) || (c.name === 'Colombia' && val.startsWith('3')));
        
        // Si empieza por 3, asumimos Colombia (caso especial que pediste)
        if(val.startsWith('3')) detected = COUNTRY_RULES[0]; 

        const hint = document.getElementById('phone-error') || createErrorSpan(phoneIn);
        if(detected) {
            hint.className = 'text-success small mt-1';
            hint.innerText = `${detected.flag} ${detected.name} detectado. (Requiere ${detected.len} dígitos)`;
            
            // Validar longitud y patrón exacto
            if(!detected.regex.test(val)) {
                hint.className = 'text-danger small mt-1';
                hint.innerText = `❌ ${detected.flag} Formato inválido. Debe tener ${detected.len} dígitos y empezar correctamente.`;
                phoneIn.setCustomValidity("Invalid");
            } else {
                hint.innerText = `✅ ${detected.flag} Número válido de ${detected.name}`;
                phoneIn.setCustomValidity("");
            }
        } else {
            hint.className = 'text-muted small mt-1';
            hint.innerText = "Escribe el número con prefijo (ej: 573...) o local si es Colombia.";
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.innerHTML = '';

        // 1. Validar Nombre (Tus reglas)
        const nameVal = nameIn.value.trim();
        const words = nameVal.split(/\s+/);
        if(words.length > 3) return showError("Máximo 3 palabras en el nombre.");
        if(words.length < 1) return showError("Escribe tu nombre.");
        if(new Set(words).size !== words.length) return showError("No repitas nombres.");
        if(/(.)\1\1/.test(nameVal)) return showError("Nombre sospechoso (letras triples).");

        // 2. Validar Password
        const passVal = passIn.value;
        if(passVal.length < 10) return showError("Contraseña insegura: Mínimo 10 caracteres.");
        if(!/[A-Z]/.test(passVal) || !/[0-9]/.test(passVal) || !/[!@#$]/.test(passVal)) return showError("Contraseña debe tener Mayúscula, Número y Símbolo (!@#$).");

        // 3. Validar Teléfono (Check final)
        if(phoneIn.checkValidity() === false) return showError("Corrige el número de teléfono.");

        // Enviar
        msg.innerHTML = '<span class="text-white">Procesando...</span>';
        
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: nameVal,
                    email: document.getElementById('reg-email').value,
                    password: passVal,
                    phone: phoneIn.value
                })
            });
            const data = await res.json();
            
            if(res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                showError(data.message);
            }
        } catch(err) { showError("Error de conexión"); }
    });
}

function showError(txt) {
    const msg = document.getElementById('msg');
    msg.innerHTML = `<span class="text-danger fw-bold">❌ ${txt}</span>`;
}

function createErrorSpan(input) {
    const s = document.createElement('div');
    s.id = 'phone-error';
    input.parentNode.appendChild(s);
    return s;
}

// ==========================================
// 4. FUNCIONES AUXILIARES (Carrito, Login, Reviews)
// ==========================================
// (Estas son necesarias para que no crashee el resto)

async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    c.innerHTML = 'Cargando...';
    try {
        const r = await fetch(`${API_URL}/products/${pid}/reviews`).then(x=>x.json());
        c.innerHTML = r.length ? r.map(x=>`<div class="border-bottom p-2"><b class="text-danger">${x.user_name}</b>: ${x.comment}</div>`).join('') : 'Sin reseñas.';
    } catch(e) { c.innerHTML = 'Error reseñas.'; }
}

window.addToCart = function(id) {
    const p = allProducts.find(x=>x.id===id);
    if(p) { 
        const exist = cart.find(c=>c.id===id);
        if(exist) exist.quantity++; else cart.push({...p, quantity:1});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        alert("Añadido");
    }
}

function updateCartUI() {
    const el = document.getElementById('cart-count');
    if(el) el.innerText = cart.reduce((a,b)=>a+b.quantity,0);
}

function checkAuthStatus() {
    const u = JSON.parse(localStorage.getItem('user'));
    const div = document.getElementById('auth-section');
    if(div && u) div.innerHTML = `<button class="btn btn-sm btn-light" onclick="localStorage.clear();location.reload()">Salir</button>`;
}

function initLogin() {
    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/auth/login`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value})
        });
        if(res.ok) {
            const d = await res.json();
            localStorage.setItem('token', d.token);
            localStorage.setItem('user', JSON.stringify(d.user));
            window.location.href='index.html';
        } else alert("Error credenciales");
    });
}