const API_URL = '/api'; 

// Estado Global
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;

// Mapa de reglas telefónicas por país (Tu lista exacta)
const PHONE_RULES = [
    { country: "Colombia", code: "+57", digits: 10, flag: "🇨🇴", pattern: /^3\d{9}$/ }, // Empieza en 3, 10 dígitos total
    { country: "México", code: "+52", digits: 10, flag: "🇲🇽", pattern: /^\d{10}$/ },
    { country: "USA", code: "+1", digits: 10, flag: "🇺🇸", pattern: /^\d{10}$/ },
    { country: "Chile", code: "+56", digits: 9, flag: "🇨🇱", pattern: /^9\d{8}$/ },
    { country: "Perú", code: "+51", digits: 9, flag: "🇵🇪", pattern: /^9\d{8}$/ },
    { country: "Argentina", code: "+54", digits: 11, flag: "🇦🇷", pattern: /^\d{10,11}$/ },
    { country: "Ecuador", code: "+593", digits: 10, flag: "🇪🇨", pattern: /^09\d{8}$/ },
    { country: "España", code: "+34", digits: 9, flag: "🇪🇸", pattern: /^[67]\d{8}$/ }
];

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();

    // A. Detectar página y cargar lógica específica
    if (document.getElementById('products-container')) {
        initStore();
        if(document.getElementById('map')) initMap();
    }
    if (document.getElementById('login-form')) initLogin();
    if (document.getElementById('register-form')) initRegister(); // Aquí van las validaciones estrictas
    if (document.getElementById('admin-products-list')) loadAdminProducts();

    // B. Listeners Filtros
    const filters = document.querySelectorAll('#category-filters button');
    filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(e.target.dataset.filter);
        });
    });

    // C. Listener Reseñas
    const reviewForm = document.getElementById('reviewForm');
    if(reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);
});

// ==========================================
// 2. VALIDACIONES ESTRICTAS (REGISTRO)
// ==========================================

function initRegister() {
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone'); // Input normal, nosotros lo validamos
    const passInput = document.getElementById('reg-pass');
    const form = document.getElementById('register-form');
    const msg = document.getElementById('msg');
    const phoneHint = document.getElementById('phone-hint'); // Crear un <small> debajo del input si no existe

    // Listeners en tiempo real (onInput)
    nameInput.addEventListener('input', () => validateName(nameInput));
    emailInput.addEventListener('input', () => validateEmail(emailInput));
    passInput.addEventListener('input', () => validatePass(passInput));
    phoneInput.addEventListener('input', () => validatePhoneStrict(phoneInput, phoneHint));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar todo de una vez antes de enviar
        const v1 = validateName(nameInput);
        const v2 = validateEmail(emailInput);
        const v3 = validatePass(passInput);
        const v4 = validatePhoneStrict(phoneInput, phoneHint);

        if (!v1 || !v2 || !v3 || !v4) {
            msg.innerHTML = '<span class="text-danger fw-bold">❌ Corrige los errores antes de continuar.</span>';
            return;
        }

        msg.innerHTML = '<span class="text-white"><i class="fa fa-spinner fa-spin"></i> Registrando usuario...</span>';

        // Preparar datos (incluyendo prefijo país si es necesario)
        // En este caso guardamos el número tal cual lo escribió el usuario + detección
        const cleanPhone = phoneInput.value.replace(/\D/g, ''); 
        
        const data = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passInput.value,
            phone: cleanPhone
        };

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                msg.innerHTML = '<span class="text-success fw-bold">✅ ¡Registro Exitoso! Bienvenido al club.</span>';
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                msg.innerHTML = `<span class="text-danger">❌ ${result.message}</span>`;
            }
        } catch (error) {
            msg.innerHTML = '<span class="text-danger">Error de conexión.</span>';
        }
    });
}

// --- FUNCIONES DE VALIDACIÓN ---

function validateName(input) {
    const val = input.value.trim();
    const errorSpan = input.nextElementSibling; // Asumimos que hay un span de error abajo o lo creamos
    
    // Reglas:
    // 1. Max 3 palabras, Min 1
    const words = val.split(/\s+/);
    if (words.length > 3 || val === "") return markInvalid(input, "Máximo 3 palabras (Nombre y Apellidos).");
    
    // 2. No repetir palabras ("Ana Ana")
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size !== words.length) return markInvalid(input, "No repitas nombres.");

    // 3. No letras triples ("Carlosss")
    if (/(.)\1\1/.test(val)) return markInvalid(input, "Demasiadas letras repetidas.");

    // 4. Solo letras
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(val)) return markInvalid(input, "Solo letras, sin símbolos ni números.");

    return markValid(input);
}

function validateEmail(input) {
    const val = input.value.trim();
    // Regex estándar + min 3 letras antes del @
    const regex = /^.{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(val)) return markInvalid(input, "Correo inválido. Mínimo 3 letras antes del @.");
    return markValid(input);
}

function validatePass(input) {
    const val = input.value;
    // Min 10, Mayus, Minus, Num, Simbolo, No espacios
    if (val.length < 10) return markInvalid(input, "Mínimo 10 caracteres.");
    if (/\s/.test(val)) return markInvalid(input, "No se permiten espacios.");
    if (!/[A-Z]/.test(val)) return markInvalid(input, "Falta una mayúscula.");
    if (!/[a-z]/.test(val)) return markInvalid(input, "Falta una minúscula.");
    if (!/[0-9]/.test(val)) return markInvalid(input, "Falta un número.");
    if (!/[!@#$%^&*()\-_=+?]/.test(val)) return markInvalid(input, "Falta un símbolo (!@#$).");
    
    // No repetir letra más de 2 veces ("aaa")
    if (/(.)\1\1/.test(val)) return markInvalid(input, "Carácteres repetidos inseguros.");

    return markValid(input);
}

function validatePhoneStrict(input, hintEl) {
    let val = input.value.replace(/\D/g, ''); // Solo números para analizar
    
    // Intentar detectar país
    let detected = null;
    
    // Lógica simple: Si empieza por 3, es Colombia? No necesariamente, pero el usuario no escribe +57
    // Asumiremos que el usuario escribe el número LOCAL.
    // O si escribe el prefijo, lo detectamos.
    
    // Para simplificar según tu petición: "Si escribe 313, es Colombia".
    if (val.startsWith('3')) { 
        detected = PHONE_RULES.find(c => c.country === 'Colombia'); 
    } else if (val.startsWith('55') || val.startsWith('56')) {
        detected = PHONE_RULES.find(c => c.country === 'México');
    } else if (val.startsWith('9')) {
         // Chile o Peru empiezan por 9. Diferenciar por longitud.
         if(val.length === 9) detected = PHONE_RULES.find(c => c.country === 'Chile'); // O Peru
    }
    // ... Puedes agregar más lógica de detección automática aquí
    
    // Si no detectamos por número, usamos por defecto Colombia para validar longitud si no hay nada
    if(!detected && val.length > 0) detected = PHONE_RULES[0]; 

    if (detected) {
        if(hintEl) hintEl.textContent = `${detected.flag} Detectado: ${detected.country} (${detected.digits} dígitos)`;
        
        // Validar Patrón exacto
        if (!detected.pattern.test(val)) {
            return markInvalid(input, `Formato inválido para ${detected.country}.`);
        }
    }

    return markValid(input);
}

function markInvalid(input, msg) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    // Mostrar mensaje en el div 'msg' o un nextSibling
    // Para este ejemplo simple, usamos título o un elemento hermano
    let err = input.nextElementSibling;
    if(!err || !err.classList.contains('invalid-feedback')) {
        // Si no existe, lo creamos dinámicamente
        err = document.createElement('div');
        err.className = 'invalid-feedback';
        input.parentNode.appendChild(err);
    }
    err.textContent = msg;
    err.style.display = 'block';
    return false;
}

function markValid(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    let err = input.nextElementSibling;
    if(err && err.classList.contains('invalid-feedback')) err.style.display = 'none';
    return true;
}


// ==========================================
// 3. TIENDA (Sketchfab Integration & Fix No Image)
// ==========================================

async function initStore() {
    const loader = document.getElementById('loader');
    const container = document.getElementById('products-container');

    try {
        const res = await fetch(`${API_URL}/store/products`);
        if(!res.ok) throw new Error("Error API");
        
        allProducts = await res.json();
        loader.classList.add('d-none');
        container.classList.remove('d-none');
        
        // Render inicial
        renderProducts('all');

        // Buscador
        document.getElementById('search-input').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
            renderProducts(null, filtered);
        });

    } catch (error) {
        loader.innerHTML = '<div class="text-danger text-center">Error conectando al garaje.</div>';
    }
}

function renderProducts(categoryFilter, customList = null) {
    const container = document.getElementById('products-container');
    let productsToShow = customList || allProducts;

    if (!customList && categoryFilter && categoryFilter !== 'all') {
        productsToShow = allProducts.filter(p => p.category === categoryFilter);
    }

    if (productsToShow.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3>No hay items aquí.</h3></div>';
        return;
    }

    container.innerHTML = productsToShow.map(p => {
        const isOut = p.stock <= 0;
        const priceUSD = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        
        // FIX DE IMAGEN: Si la URL falla, ponemos una por defecto bonita
        const img = p.image_url || 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=800&q=80'; 

        return `
        <div class="col-md-6 col-lg-4">
            <div class="card bg-dark text-white border-secondary h-100 shadow-sm hover-scale product-card">
                <div class="position-relative overflow-hidden" style="height: 250px;">
                    <img src="${img}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category || 'General'}</div>
                    ${isOut ? '<div class="badge bg-secondary position-absolute top-0 start-0 m-3 shadow">AGOTADO</div>' : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold text-uppercase text-truncate">${p.name}</h5>
                    <p class="card-text text-muted small text-truncate">${p.description || 'Sin descripción'}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                        <span class="fs-5 fw-bold text-danger">${priceUSD}</span>
                        <div>
                            <button onclick="openProductModal(${p.id})" class="btn btn-outline-light btn-sm me-1" title="Ver 3D y Detalles"><i class="fa-solid fa-cube"></i> 3D</button>
                            <button onclick="addToCart(${p.id})" class="btn btn-danger btn-sm" ${isOut ? 'disabled' : ''}>${isOut ? 'AGOTADO' : '<i class="fa fa-cart-plus"></i>'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 4. MODAL CON SKETCHFAB (Visualización Real)
// ==========================================

async function openProductModal(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;

    currentProductModalId = id;

    // Llenar textos
    document.getElementById('modal-p-name').textContent = p.name;
    document.getElementById('modal-p-desc').textContent = p.description;
    document.getElementById('modal-p-price').textContent = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('modal-p-stock').textContent = `Disponibles: ${p.stock}`;
    document.getElementById('modal-p-id').value = p.id;

    // Lógica Visualizador (Sketchfab vs Imagen)
    const imgContainer = document.getElementById('modal-p-img').parentNode; 
    imgContainer.innerHTML = '';

    // Si tiene modelo URL (Sketchfab), usamos Iframe
    if (p.model_url && p.model_url.includes('sketchfab')) {
        imgContainer.innerHTML = `
            <div class="ratio ratio-16x9 border border-secondary rounded shadow">
                <iframe 
                    title="${p.name}" 
                    frameborder="0" 
                    allowfullscreen 
                    mozallowfullscreen="true" 
                    webkitallowfullscreen="true" 
                    allow="autoplay; fullscreen; xr-spatial-tracking" 
                    src="${p.model_url}/embed?autostart=1&ui_theme=dark">
                </iframe>
            </div>
            <small class="text-muted d-block text-center mt-2"><i class="fa-solid fa-rotate"></i> Modelo Interactivo 3D</small>
        `;
    } else {
        // Imagen Estática
        const img = p.image_url || 'https://placehold.co/600x400?text=No+Image';
        imgContainer.innerHTML = `<img src="${img}" class="img-fluid rounded border border-secondary shadow" alt="${p.name}">`;
    }

    // Cargar reseñas
    loadReviews(id);
    
    // Abrir Modal
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

// ... (Resto de funciones: loadReviews, handleReviewSubmit, addToCart, checkout, etc. igual que antes) ...

async function loadReviews(productId) {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '<p class="text-muted small">Cargando...</p>';
    try {
        const res = await fetch(`${API_URL}/products/${productId}/reviews`);
        const reviews = await res.json();
        if (reviews.length === 0) {
            container.innerHTML = '<p class="text-muted small">Sé el primero en opinar.</p>';
            return;
        }
        container.innerHTML = reviews.map(r => `
            <div class="bg-dark p-2 rounded mb-2 border border-secondary">
                <div class="d-flex justify-content-between">
                    <strong class="text-white small">${r.user_name}</strong>
                    <span class="text-warning small">${'★'.repeat(r.rating)}</span>
                </div>
                <p class="text-light small mb-0 mt-1">${r.comment}</p>
            </div>
        `).join('');
    } catch (e) { container.innerHTML = '<p class="text-danger small">Error cargando reseñas.</p>'; }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert("Inicia sesión para opinar.");
    
    const data = {
        productId: currentProductModalId,
        rating: document.getElementById('review-rating').value,
        comment: document.getElementById('review-comment').value
    };
    
    await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    loadReviews(currentProductModalId);
    document.getElementById('review-comment').value = '';
}

function initLogin() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('msg');
        msg.innerHTML = '<span class="text-white"><i class="fa fa-spinner fa-spin"></i> Verificando...</span>';

        const data = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-pass').value
        };

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = result.user.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                msg.innerHTML = `<span class="text-danger">❌ ${result.message}</span>`;
            }
        } catch (error) {
            msg.innerHTML = '<span class="text-danger">Error de servidor.</span>';
        }
    });
}

function checkAuthStatus() {
    const u = JSON.parse(localStorage.getItem('user'));
    const section = document.getElementById('auth-section');
    if(section && u) {
        section.innerHTML = `<button onclick="logout()" class="btn btn-sm btn-outline-light">Salir (${u.name.split(' ')[0]})</button>`;
        const form = document.getElementById('review-form-container');
        if(form) form.classList.remove('d-none');
    }
}

window.logout = function() { localStorage.clear(); window.location.href = 'index.html'; }
window.toggleChat = function() { document.getElementById('chat-window').classList.toggle('d-none'); }
window.addToCart = function(id) { /* Lógica carrito simple */ alert("Añadido"); }
window.openPaymentModal = function() { /* Modal pago */ alert("Abrir pago"); }