const API_URL = '/api';
let cart = [];
let allProducts = [];
let iti = null;
let map;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuración de Teléfono Internacional (Librería intl-tel-input)
    const phoneInput = document.querySelector("#reg-phone");
    if (phoneInput && window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: c => fetch("https://ipapi.co/json").then(r => r.json()).then(d => c(d.country_code)).catch(() => c("co")),
            preferredCountries: ["co", "fr", "us", "es", "mx"], // Francia agregada
            separateDialCode: true,
            nationalMode: true
        });

        // Validar en tiempo real al escribir o cambiar país
        phoneInput.addEventListener('input', validatePhone);
        phoneInput.addEventListener('countrychange', validatePhone);
    }

    // 2. Listeners de Validación
    if(document.getElementById('register-form')) {
        document.getElementById('reg-name').addEventListener('input', validateName);
        document.getElementById('reg-email').addEventListener('input', validateEmail);
        document.getElementById('reg-pass').addEventListener('input', validatePassword);
        document.getElementById('register-form').addEventListener('submit', handleRegister);
    }
    
    // 3. Cargas Generales
    checkSession();
    updateCartUI(); // Asegurar que el carrito se pinte al cargar
    if(document.getElementById('products-container')) loadProducts();
    if(document.getElementById('map')) initMap();
    if(document.getElementById('login-form')) setupLogin();
});

// ==========================================
// VALIDACIONES (ESTRICTAS Y MUNDIALES)
// ==========================================

function validatePhone() {
    const input = document.querySelector("#reg-phone");
    const err = document.getElementById('err-phone');
    
    if (!iti) return false;

    // 1. Validación Maestra de la Librería (Detecta país, longitud y formato oficial)
    if (iti.isValidNumber()) {
        return showSuccess(input, err);
    } else {
        // Diagnóstico de error específico
        const errorCode = iti.getValidationError();
        let msg = "Número inválido.";
        
        switch(errorCode) {
            case 1: msg = "Código de país inválido."; break;
            case 2: msg = "El número es demasiado corto."; break;
            case 3: msg = "El número es demasiado largo."; break;
            case 4: msg = "Formato incorrecto."; break;
        }
        return showError(input, err, msg);
    }
}

function validateName() {
    const input = document.getElementById('reg-name');
    const err = document.getElementById('err-name');
    const val = input.value.trim();
    
    // Reglas Estrictas
    const words = val.split(/\s+/);
    if (words.length < 1 || val === "") return showError(input, err, "Nombre requerido.");
    if (words.length > 3) return showError(input, err, "Máximo 3 palabras.");

    // Anti-repetición de palabras
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size !== words.length) return showError(input, err, "No repitas nombres.");

    // Solo letras
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(val)) return showError(input, err, "Solo letras permitidas.");

    // Anti-repetición de caracteres (AA, nn) en cada palabra
    for(let w of words) {
        if(/(.)\1/.test(w.toLowerCase())) return showError(input, err, `Letras repetidas en "${w}".`);
        if(w.length < 2) return showError(input, err, `"${w}" es muy corto.`);
    }

    return showSuccess(input, err);
}

function validateEmail() {
    const input = document.getElementById('reg-email');
    const err = document.getElementById('err-email');
    const val = input.value.trim();

    // Regex Estricto
    if (!/^[a-zA-Z0-9._-]{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(val)) {
        return showError(input, err, "Correo inválido o muy corto.");
    }
    
    // Dominios temporales
    if (val.includes('yopmail') || val.includes('tempmail')) {
        return showError(input, err, "No aceptamos correos temporales.");
    }
    return showSuccess(input, err);
}

function validatePassword() {
    const input = document.getElementById('reg-pass');
    const err = document.getElementById('err-pass');
    const val = input.value;

    if (val.length < 10) return showError(input, err, "Mínimo 10 caracteres.");
    if (!/[A-Z]/.test(val)) return showError(input, err, "Falta Mayúscula.");
    if (!/[a-z]/.test(val)) return showError(input, err, "Falta Minúscula.");
    if (!/[0-9]/.test(val)) return showError(input, err, "Falta Número.");
    if (!/[!@#$%^&*]/.test(val)) return showError(input, err, "Falta Símbolo (!@#$%).");
    if (/(.)\1\1/.test(val)) return showError(input, err, "No repitas caracteres (aaa).");

    return showSuccess(input, err);
}

// Helpers visuales
function showError(input, errSpan, msg) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    if(errSpan) { errSpan.textContent = msg; errSpan.style.color = 'red'; }
    return false;
}
function showSuccess(input, errSpan) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    if(errSpan) { errSpan.textContent = ''; }
    return true;
}

// ==========================================
// REGISTRO & LOGIN
// ==========================================
async function handleRegister(e) {
    e.preventDefault();

    if (!validateName() || !validateEmail() || !validatePassword() || !validatePhone()) {
        alert("Corrige los errores antes de enviar.");
        return;
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    const data = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-pass').value,
        phone: iti.getNumber() // Obtiene el número completo con prefijo (+57...)
    };

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        const json = await res.json();

        if (res.ok) {
            localStorage.setItem('pendingEmail', data.email);
            let code = prompt(`✅ Código enviado a ${data.email}.\nIngrésalo aquí:`);
            if(code) verifyCode(data.email, code);
        } else {
            alert("❌ Error: " + json.message);
        }
    } catch (err) {
        alert("Error de conexión.");
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function verifyCode(email, code) {
    try {
        const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, code })
        });
        const json = await res.json();
        if(res.ok) {
            alert("¡Cuenta verificada! Inicia sesión.");
            window.location.href = 'login.html';
        } else {
            alert("Error: " + json.message);
        }
    } catch(e) { alert("Error verificando código."); }
}

function setupLogin() {
    const form = document.getElementById('login-form');
    if(!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if(res.ok) {
                localStorage.setItem('user', JSON.stringify(json.user));
                localStorage.setItem('token', json.token);
                window.location.href = 'index.html';
            } else {
                alert(json.message);
            }
        } catch(err) { alert("Error de conexión"); }
    });
}

// ==========================================
// CATÁLOGO, CARRITO & PAGOS
// ==========================================
async function loadProducts() {
    const cont = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    try {
        const res = await fetch(`${API_URL}/products`);
        allProducts = await res.json();
        if(loader) loader.classList.add('d-none');
        if(cont) cont.classList.remove('d-none');
        renderProducts(allProducts);
    } catch(e) { console.error(e); }
}

function renderProducts(products) {
    const cont = document.getElementById('products-container');
    if(!cont) return;
    
    cont.innerHTML = products.map(p => {
        const inCart = cart.find(c => c.id === p.id)?.quantity || 0;
        const realStock = p.stock - inCart;
        const isOut = realStock <= 0;
        const price = parseFloat(p.price).toLocaleString('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0});
        
        // Usar modelo 3D real si existe, sino fallback
        const modelUrl = p.model_url || "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
        const safeName = p.name.replace(/'/g, "\\'");

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="product-card h-100 bg-dark text-white border border-secondary position-relative">
                <span class="badge ${isOut ? 'bg-secondary' : 'bg-success'} position-absolute m-3">${isOut ? 'AGOTADO' : 'DISPONIBLE'}</span>
                
                <div class="card-img-wrap" style="height:250px; cursor:pointer;" onclick="viewProduct3D('${safeName}', '${modelUrl}')">
                    <img src="${p.image_url}" class="w-100 h-100 object-fit-cover">
                    <div class="overlay-3d position-absolute top-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background:rgba(0,0,0,0.5); opacity:0; transition:0.3s">
                        <i class="fa-solid fa-cube fa-3x text-danger"></i>
                    </div>
                </div>
                
                <div class="p-3">
                    <h5 class="fw-bold text-uppercase">${p.name}</h5>
                    <p class="text-danger fw-bold fs-5">${price}</p>
                    <button class="btn btn-outline-light w-100" onclick="addToCart(${p.id})" ${isOut ? 'disabled' : ''}>
                        ${isOut ? 'Sin Stock' : 'Agregar al Garaje'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Hover effect
    document.querySelectorAll('.card-img-wrap').forEach(el => {
        el.addEventListener('mouseenter', () => el.querySelector('.overlay-3d').style.opacity = '1');
        el.addEventListener('mouseleave', () => el.querySelector('.overlay-3d').style.opacity = '0');
    });
}

window.viewProduct3D = function(name, url) {
    const viewer = document.querySelector('model-viewer');
    if(viewer) {
        viewer.src = url;
        viewer.alt = name;
        viewer.scrollIntoView({behavior: 'smooth'});
        alert(`Cargando vista 3D: ${name}`);
    } else {
        // Fallback: abrir modal si no hay viewer en página principal
        window.open(url, '_blank');
    }
}

// CARRITO
window.addToCart = function(id) {
    const p = allProducts.find(x => x.id === id);
    const item = cart.find(x => x.id === id);
    if(item) {
        if(item.quantity >= p.stock) return alert("¡No hay más stock!");
        item.quantity++;
    } else {
        cart.push({...p, quantity: 1});
    }
    updateCartUI();
    renderProducts(allProducts); // Actualizar stock visual
}

window.removeFromCart = function(id) {
    cart = cart.filter(x => x.id !== id);
    updateCartUI();
    renderProducts(allProducts);
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if(count) {
        const qty = cart.reduce((a,b)=>a+b.quantity,0);
        count.innerText = qty;
        count.style.display = qty > 0 ? 'block' : 'none';
    }

    if(list && totalEl) {
        let total = 0;
        if(cart.length === 0) {
            list.innerHTML = '<div class="text-center p-3">Vacío</div>';
        } else {
            list.innerHTML = cart.map(i => {
                total += i.price * i.quantity;
                return `
                <div class="d-flex justify-content-between mb-2 border-bottom border-secondary pb-2">
                    <div>
                        <small class="d-block text-white">${i.name}</small>
                        <small class="text-muted">${i.quantity} x $${parseFloat(i.price).toLocaleString('es-CO')}</small>
                    </div>
                    <button onclick="removeFromCart(${i.id})" class="btn btn-sm text-danger"><i class="fa fa-trash"></i></button>
                </div>`;
            }).join('');
        }
        totalEl.innerText = total.toLocaleString('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0});
    }
}

// PAGOS (SOLUCIÓN)
window.openPaymentModal = function() {
    if(cart.length === 0) return alert("Tu garaje está vacío.");
    
    // Intentar obtener el modal de Bootstrap
    const modalEl = document.getElementById('paymentModal');
    if(modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        // Asignar evento al botón de pagar DENTRO del modal
        const payBtn = modalEl.querySelector('.btn-success');
        if(payBtn) {
            payBtn.onclick = () => {
                // Simulación de pasarela
                payBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Conectando Banco...';
                setTimeout(() => {
                    alert("¡Pago Exitoso! (Simulación)");
                    cart = [];
                    updateCartUI();
                    renderProducts(allProducts);
                    modal.hide();
                    payBtn.innerHTML = 'PAGAR AHORA';
                }, 2000);
            };
        }
    } else {
        alert("Error cargando la pasarela de pagos.");
    }
}

// Auth Check Helper
function checkSession() {
    const user = localStorage.getItem('user');
    const authDiv = document.getElementById('auth-section');
    if(user && authDiv) {
        const u = JSON.parse(user);
        authDiv.innerHTML = `<button onclick="localStorage.clear();location.reload()" class="btn btn-sm btn-outline-danger">Hola ${u.name.split(' ')[0]} (Salir)</button>`;
    }
}
// ==========================================
// 1. MAPA DE LUJO (LEAFLET)
// ==========================================
function initMap() {
    // Coordenadas: Zona T, Bogotá
    const lat = 4.666;
    const lng = -74.053;
    
    map = L.map('map').setView([lat, lng], 15);
    
    // Capa Oscura "CartoDB DarkMatter" (Estilo Cyberpunk/Lujo)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Icono Personalizado (Punto Rojo Neón)
    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#ff2800; width:15px; height:15px; border-radius:50%; box-shadow:0 0 15px #ff2800; border: 2px solid white;'></div>",
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });

    // Marcador con Popup elegante
    L.marker([lat, lng], { icon: icon }).addTo(map)
        .bindPopup(`
            <div style="text-align:center; color:black;">
                <b style="color:#d90429">SPEEDCOLLECT HQ</b><br>
                Bogotá, Colombia<br>
                <small>Abierto hasta las 8:00 PM</small>
            </div>
        `)
        .openPopup();
}

// ==========================================
// 2. CATÁLOGO & VISOR 3D
// ==========================================
async function loadProducts() {
    const cont = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) throw new Error(`API Error: ${res.status}`);
        
        allProducts = await res.json();
        
        if (loader) loader.classList.add('d-none');
        if (cont) cont.classList.remove('d-none');
        
        renderProducts(allProducts);
        
    } catch (e) {
        console.error(e);
        if (loader) loader.innerHTML = '<div class="text-danger">Error de conexión con el servidor.</div>';
    }
}

function renderProducts(products) {
    const cont = document.getElementById('products-container');
    if (!cont) return;

    if(!products || products.length === 0) { 
        cont.innerHTML = '<div class="col-12 text-center text-muted">Inventario agotado por el momento.</div>'; 
        return; 
    }

    cont.innerHTML = products.map(p => {
        // Lógica de Imagen
        const img = p.image_url && p.image_url.startsWith('http') ? p.image_url : 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=500';
        
        // Lógica de Stock (BD - Carrito)
        const inCart = cart.find(c => c.id === p.id);
        const cartQty = inCart ? inCart.quantity : 0;
        const realStock = p.stock - cartQty;
        
        const isOut = realStock <= 0;
        const btnState = isOut ? 'disabled' : '';
        const stockBadge = isOut 
            ? `<span class="badge bg-secondary position-absolute top-0 start-0 m-3 shadow">AGOTADO</span>`
            : (realStock < 3 
                ? `<span class="badge bg-warning text-dark position-absolute top-0 start-0 m-3 shadow">¡ÚLTIMAS ${realStock}!</span>`
                : `<span class="badge bg-success position-absolute top-0 start-0 m-3 shadow">DISPONIBLE</span>`);

        // Formato Precio COP
        const precio = parseFloat(p.price).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

        // URL del modelo 3D (Si no existe en DB, usa uno genérico de ejemplo)
        // NOTA: Para producción, agrega un campo 'model_url' a tu tabla products
        const model3D = p.model_url || "https://modelviewer.dev/shared-assets/models/Astronaut.glb"; 

        return `
        <div class="col-md-6 col-lg-4">
            <div class="product-card h-100 position-relative overflow-hidden">
                ${stockBadge}
                
                <div class="card-img-wrap" style="height:280px; cursor:pointer;" onclick="viewProduct3D('${p.name}', '${model3D}')">
                    <img src="${img}" class="img-fluid w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="overlay-3d position-absolute w-100 h-100 d-flex align-items-center justify-content-center" 
                         style="background:rgba(0,0,0,0.6); opacity:0; transition:0.3s; top:0;">
                        <div class="text-center text-white">
                            <i class="fa-solid fa-cube fa-3x mb-2 text-danger"></i>
                            <p class="fw-bold text-uppercase ls-2">Ver en 3D</p>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 bg-dark-glass">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-warning small"><i class="fa fa-star"></i> 4.9 (Ver reseñas)</span>
                        <span class="text-muted small">Ref: 00${p.id}</span>
                    </div>
                    
                    <h5 class="fw-bold text-uppercase text-white text-truncate mb-1">${p.name}</h5>
                    <p class="small text-secondary text-truncate">${p.description || 'Edición Limitada Coleccionista'}</p>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                        <div class="price-tag fw-bold fs-4 text-danger">${precio}</div>
                        <button class="btn btn-outline-light btn-sm rounded-circle p-2" onclick="addToCart(${p.id})" ${btnState}>
                            <i class="fa fa-plus fa-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Efecto Hover para el overlay 3D
    document.querySelectorAll('.card-img-wrap').forEach(el => {
        el.addEventListener('mouseenter', () => el.querySelector('.overlay-3d').style.opacity = '1');
        el.addEventListener('mouseleave', () => el.querySelector('.overlay-3d').style.opacity = '0');
    });
}

// Función para cambiar el modelo 3D en el visor principal (o abrir modal)
window.viewProduct3D = function(name, modelUrl) {
    const viewer = document.querySelector('model-viewer');
    if(viewer) {
        // Hacemos scroll suave hacia el visor
        viewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Cambiamos el modelo
        viewer.src = modelUrl;
        viewer.alt = `Modelo 3D de ${name}`;
        // Notificación visual
        alert(`Cargando vista 3D de: ${name}. Usa el mouse para rotar.`);
    } else {
        alert("Visor 3D no encontrado en esta página.");
    }
}

// ==========================================
// 3. IA CHATBOT (ENZO)
// ==========================================
window.toggleChat = function() {
    const chat = document.getElementById('chat-window');
    chat.classList.toggle('d-none');
}

window.sendChat = async function() {
    const input = document.getElementById('chat-input');
    const body = document.getElementById('chat-body');
    const msg = input.value;
    
    if(!msg) return;

    // 1. Mostrar mensaje del usuario
    body.innerHTML += `
        <div class="d-flex justify-content-end mb-3">
            <div class="bg-danger text-white p-2 px-3 rounded-start rounded-top small shadow" style="max-width: 80%;">${msg}</div>
        </div>`;
    
    input.value = '';
    body.scrollTop = body.scrollHeight;

    // 2. Indicador de "Escribiendo..."
    const loadId = 'loader-' + Date.now();
    body.innerHTML += `
        <div id="${loadId}" class="d-flex justify-content-start mb-3">
            <div class="bg-secondary text-white p-2 px-3 rounded-end rounded-top small shadow">
                <i class="fa-solid fa-circle-notch fa-spin"></i> Analizando motor...
            </div>
        </div>`;

    try {
        // Llamada al Backend (Asegúrate de tener aiController configurado)
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt: msg })
        });
        
        const data = await res.json();
        document.getElementById(loadId).remove();
        
        const reply = data.reply || "Lo siento, mi sistema de navegación está recalculando. ¿Puedes repetir?";
        
        // 3. Mostrar respuesta de la IA
        body.innerHTML += `
            <div class="d-flex justify-content-start mb-3">
                <div class="bg-dark border border-secondary text-light p-2 px-3 rounded-end rounded-top small shadow" style="max-width: 85%;">
                    <i class="fa-solid fa-robot text-danger me-1"></i> ${reply}
                </div>
            </div>`;
        
        body.scrollTop = body.scrollHeight;

    } catch (e) {
        console.error(e);
        document.getElementById(loadId).innerHTML = '<span class="text-danger">Error de conexión con la IA.</span>';
    }
}


// ==========================================
// 4. CARRITO Y PAGOS
// ==========================================
window.addToCart = function(id) {
    const product = allProducts.find(p => p.id === id);
    if(!product) return;

    const existing = cart.find(i => i.id === id);
    const currentQty = existing ? existing.quantity : 0;

    if(currentQty >= product.stock) {
        alert('¡Lo sentimos! No quedan más unidades de este modelo exclusivo.');
        return;
    }

    if(existing) existing.quantity++;
    else cart.push({...product, quantity: 1});

    updateCartUI();
    renderProducts(allProducts); // Actualizar badges de stock
    
    // Animación pequeña en el icono del carrito
    const cartIcon = document.querySelector('.fa-cart-shopping');
    if(cartIcon) {
        cartIcon.classList.add('text-danger');
        setTimeout(() => cartIcon.classList.remove('text-danger'), 300);
    }
}

window.removeFromCart = function(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
    renderProducts(allProducts);
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    if(count) {
        const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
        count.innerText = totalQty;
        count.style.display = totalQty > 0 ? 'block' : 'none';
    }
    
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if(!list || !totalEl) return;

    if(!cart.length) {
        list.innerHTML = '<div class="text-center py-5 text-muted"><i class="fa-solid fa-car-tunnel fa-3x mb-3 opacity-50"></i><br>Tu garaje está vacío.</div>';
        totalEl.textContent = '$0';
        return;
    }

    let total = 0;
    list.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
        <div class="d-flex justify-content-between align-items-center border-bottom border-secondary mb-3 pb-3">
            <div class="d-flex align-items-center">
                <div class="bg-white rounded p-1 me-3" style="width:50px;">
                    <img src="${item.image_url}" class="img-fluid">
                </div>
                <div>
                    <div class="text-white fw-bold small">${item.name}</div>
                    <div class="text-muted small">${item.quantity} x $${parseFloat(item.price).toLocaleString('es-CO')}</div>
                </div>
            </div>
            <div class="text-end">
                <div class="text-danger fw-bold mb-1">$${(item.price * item.quantity).toLocaleString('es-CO')}</div>
                <button onclick="removeFromCart(${item.id})" class="btn btn-link text-secondary p-0 small text-decoration-none">Eliminar</button>
            </div>
        </div>`;
    }).join('');
    
    totalEl.textContent = total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

window.openPaymentModal = function() {
    if(!cart.length) return alert('El carrito está vacío');
    const token = localStorage.getItem('token');
    
    if(!token) {
        // Guardar intención de compra?
        if(confirm("Necesitas identificarte para adquirir estos vehículos exclusivos. ¿Ir al Login?")) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

// ==========================================
// 5. SESIÓN Y AUTH (Lógica Robusta Original)
// ==========================================
function checkSession() {
    const userStr = localStorage.getItem('user');
    const authDiv = document.getElementById('auth-section');
    
    if(userStr && authDiv) {
        const user = JSON.parse(userStr);
        authDiv.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-danger btn-sm dropdown-toggle text-uppercase fw-bold shadow" type="button" data-bs-toggle="dropdown">
                    <i class="fa fa-user-astronaut me-1"></i> ${user.name.split(' ')[0]}
                </button>
                <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg border border-secondary">
                    <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
                    <li><hr class="dropdown-divider bg-secondary"></li>
                    <li><button onclick="logout()" class="dropdown-item text-danger hover-white"><i class="fa fa-power-off me-2"></i> Cerrar Sesión</button></li>
                </ul>
            </div>`;
    }
}

window.logout = function() { 
    localStorage.clear(); 
    window.location.href = 'index.html'; 
}

function setupForgotPassword(linkElement) {
    linkElement.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = prompt("Ingresa tu correo para recuperar el acceso:");
        if(email && email.includes('@')) {
            try {
                const res = await fetch(`${API_URL}/auth/forgot-password`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                alert(data.message);
                
                if (res.ok) {
                    const code = prompt("Revisa tu correo e ingresa el CÓDIGO aquí:");
                    const newPass = prompt("Ingresa tu NUEVA contraseña:");
                    if(code && newPass) {
                        const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, code, newPassword: newPass })
                        });
                        const resetData = await resetRes.json();
                        alert(resetData.message);
                    }
                }
            } catch(err) {
                alert('Error de conexión.');
            }
        }
    });
}

// REGISTRO Y LOGIN (Manteniendo tu lógica original funcional)
function setupRegister() {
    const phoneInput = document.querySelector("#reg-phone");
    const regForm = document.getElementById('register-form');

    if (phoneInput && window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: c => fetch("https://ipapi.co/json").then(r => r.json()).then(d => c(d.country_code)).catch(() => c("us")),
            preferredCountries: ["co", "mx", "us", "es"],
            separateDialCode: true
        });
        phoneInput.addEventListener('input', () => {
            if (phoneInput.value.startsWith('3') && phoneInput.value.length > 2 && iti.getSelectedCountryData().iso2 !== 'co') {
                iti.setCountry('co');
            }
        });
    }
    
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('reg-name').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-pass').value,
                phone: iti ? iti.getNumber() : document.getElementById('reg-phone').value
            };
            
            const msg = document.getElementById('msg');
            if (msg) msg.innerHTML = '<div class="spinner-border spinner-border-sm text-danger"></div> Procesando...';

            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
                });
                const json = await res.json();
                if (res.ok) {
                    localStorage.setItem('pendingEmail', data.email);
                    window.location.href = 'verify.html';
                } else {
                    if (msg) msg.innerHTML = `<div class="text-danger mt-2">${json.message}</div>`;
                }
            } catch (err) { console.error(err); }
        });
    }
}

function setupLogin() {
    const logForm = document.getElementById('login-form');
    if(logForm) {
        logForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-pass').value;
            const msg = document.getElementById('msg');
            if (msg) msg.innerHTML = '<span class="text-muted">Autenticando...</span>';

            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, password })
                });
                const json = await res.json();
                if (res.ok) {
                    localStorage.setItem('user', JSON.stringify(json.user));
                    localStorage.setItem('token', json.token);
                    window.location.href = 'index.html';
                } else {
                    if(json.needsVerification) {
                        localStorage.setItem('pendingEmail', json.email);
                        window.location.href = 'verify.html';
                    } else {
                        if (msg) msg.innerHTML = `<div class="text-danger fw-bold mt-2">${json.message}</div>`;
                    }
                }
            } catch (err) { console.error(err); }
        });
    }
}