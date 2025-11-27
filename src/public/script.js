const API_URL = '/api'; 
let cart = [];
let allProducts = []; // Copia local para manejar stock visual
let iti = null;

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    
    // Inicializar lógica según la página
    if(document.getElementById('products-container')) loadProducts();
    if(document.getElementById('register-form')) setupRegister();
    if(document.getElementById('login-form')) setupLogin();
    
    // Configuración global de pagos
    setupPaymentValidation();
});

// ==========================================
// 1. SESIÓN Y AUTH
// ==========================================

function checkSession() {
    const userStr = localStorage.getItem('user');
    const authDiv = document.getElementById('auth-section');
    
    if(userStr && authDiv) {
        const user = JSON.parse(userStr);
        authDiv.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-danger btn-sm dropdown-toggle text-uppercase fw-bold" type="button" data-bs-toggle="dropdown">
                    <i class="fa fa-user-circle me-1"></i> ${user.name}
                </button>
                <ul class="dropdown-menu dropdown-menu-dark shadow">
                    <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button onclick="logout()" class="dropdown-item text-danger"><i class="fa fa-sign-out"></i> Cerrar Sesión</button></li>
                </ul>
            </div>`;
    }
}

function logout() { 
    localStorage.clear(); 
    window.location.href = 'index.html'; 
}

// Lógica de "Olvidaste tu contraseña"
// Busca enlaces que contengan el texto "Olvidaste" para asignarles la función
document.querySelectorAll('a').forEach(link => {
    if(link.innerText.includes('Olvidaste')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Por favor ingresa tu correo para enviarte el link de recuperación:");
            if(email && email.includes('@')) {
                // Simulación de envío (Conecta con tu backend si ya tienes la ruta lista)
                alert(`Hemos enviado un enlace de recuperación seguro a: ${email}\n(Revisa tu Spam en 5 minutos)`);
            } else if (email) {
                alert("Correo inválido.");
            }
        });
    }
});

// ==========================================
// 2. REGISTRO PRO (Teléfono y Validaciones)
// ==========================================

function setupRegister() {
    const phoneInput = document.querySelector("#reg-phone");
    const regForm = document.getElementById('register-form');

    // Configuración Teléfono Internacional
    if (phoneInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: callback => {
                fetch("https://ipapi.co/json")
                    .then(res => res.json())
                    .then(data => callback(data.country_code))
                    .catch(() => callback("us"));
            },
            preferredCountries: ["co", "mx", "us", "es"],
            separateDialCode: true,
            autoPlaceholder: "aggressive"
        });

        // Detección inteligente Colombia (3xx...)
        phoneInput.addEventListener('input', () => {
            const val = phoneInput.value;
            // Si empieza por 3 y tiene más de 2 dígitos, y no estamos en CO, cambiar a CO
            if (val.startsWith('3') && val.length > 2) {
                const countryData = iti.getSelectedCountryData();
                if (countryData.iso2 !== 'co') {
                    iti.setCountry('co');
                }
            }
        });
    }

    // Envío del Formulario
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpiar errores previos
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            document.querySelectorAll('.text-danger.small').forEach(el => el.classList.add('d-none'));

            let hasError = false;

            // 1. Validar Teléfono
            if (iti && !iti.isValidNumber()) {
                phoneInput.classList.add('is-invalid');
                const errDiv = document.getElementById('phone-error');
                if(errDiv) {
                    errDiv.textContent = 'Número inválido para el país seleccionado';
                    errDiv.classList.remove('d-none');
                }
                hasError = true;
            }

            // 2. Validar Campos Básicos (HTML5 valida required, pero reforzamos visualmente)
            const name = document.getElementById('reg-name');
            if(name.value.trim().split(' ').length < 2) {
                name.classList.add('is-invalid');
                hasError = true;
            }

            if (hasError) return;

            const data = {
                name: name.value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-pass').value,
                phone: iti.getNumber() // Número completo con +57...
            };

            const msg = document.getElementById('msg');
            msg.innerHTML = '<div class="spinner-border spinner-border-sm text-danger"></div> Creando perfil...';

            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(data)
                });
                const json = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('pendingEmail', data.email);
                    msg.innerHTML = `<div class="text-success fw-bold">¡Bienvenido! Redirigiendo...</div>`;
                    setTimeout(() => window.location.href = 'verify.html', 1500);
                } else {
                    // Mostrar error específico del backend
                    msg.innerHTML = `<div class="text-danger bg-dark p-2 rounded border border-danger">${json.message}</div>`;
                }
            } catch (err) { 
                msg.textContent = 'Error de conexión con el servidor.'; 
            }
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
            
            msg.innerHTML = '<span class="text-muted">Verificando credenciales...</span>';

            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ email, password })
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
                        msg.innerHTML = `<div class="text-danger fw-bold">${json.message}</div>`;
                    }
                }
            } catch (err) { msg.textContent = 'Error de conexión.'; }
        });
    }
}

// ==========================================
// 3. CATÁLOGO Y STOCK
// ==========================================

async function loadProducts() {
    const cont = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) throw new Error('Error al obtener datos');
        
        allProducts = await res.json(); // Guardar globalmente
        
        loader.classList.add('d-none');
        cont.classList.remove('d-none');
        
        // Render inicial
        renderProducts(allProducts);
        // Actualizar UI del carrito (por si recargó página)
        updateCartUI();

    } catch (e) {
        console.error(e);
        loader.innerHTML = `
            <div class="text-danger mb-3">No se pudo conectar con el servidor.</div>
            <button class="btn btn-outline-light btn-sm" onclick="location.reload()">Reintentar</button>
        `;
    }
}

function renderProducts(products) {
    const cont = document.getElementById('products-container');
    
    if(!products || products.length === 0) { 
        cont.innerHTML = '<div class="col-12 text-center text-muted">Inventario vacío por el momento.</div>'; 
        return; 
    }

    cont.innerHTML = products.map(p => {
        // Imagen fallback profesional
        const img = p.image_url && p.image_url.startsWith('http') 
            ? p.image_url 
            : 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
        
        // CALCULO DE STOCK REAL (Base de datos - Carrito Local)
        const inCart = cart.find(c => c.id === p.id);
        const cartQty = inCart ? inCart.quantity : 0;
        const realStock = p.stock - cartQty;
        
        const isOut = realStock <= 0;
        const btnState = isOut ? 'disabled' : '';
        const btnText = isOut ? 'AGOTADO' : 'AGREGAR AL GARAJE';
        const badgeClass = isOut ? 'bg-secondary' : (realStock < 3 ? 'bg-warning text-dark' : 'bg-success');
        const badgeText = isOut ? 'AGOTADO' : `${realStock} DISP.`;

        // Nombre escapado para evitar errores en onclick
        const safeName = p.name.replace(/'/g, "\\'");

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="product-card h-100 bg-dark text-white border border-secondary p-0 position-relative overflow-hidden">
                <!-- Badge de Stock -->
                <span class="position-absolute top-0 end-0 m-3 badge ${badgeClass} shadow">${badgeText}</span>
                
                <!-- Imagen con disparador 3D -->
                <div class="card-img-wrap bg-white d-flex align-items-center justify-content-center" 
                     style="height:220px; cursor:pointer; position:relative;"
                     onclick="open3D('${safeName}')"
                     title="Clic para ver en 3D">
                    <img src="${img}" class="img-fluid" style="max-height:100%; max-width:100%; object-fit:contain;">
                    <div class="overlay-3d position-absolute w-100 h-100 d-flex align-items-center justify-content-center" 
                         style="background:rgba(0,0,0,0.3); opacity:0; transition:0.3s;">
                        <i class="fa-solid fa-cube fa-3x text-white drop-shadow"></i>
                    </div>
                </div>
                
                <div class="p-4">
                    <h5 class="text-uppercase fw-bold text-truncate">${p.name}</h5>
                    <p class="small text-muted text-truncate">${p.description || 'Edición Coleccionista'}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-danger fs-4 fw-bold">$${parseFloat(p.price).toLocaleString()}</span>
                    </div>
                    <button class="btn btn-ferrari w-100 mt-3" onclick="addToCart(${p.id})" ${btnState}>
                        ${btnText}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Efecto hover para el overlay 3D
    document.querySelectorAll('.card-img-wrap').forEach(el => {
        el.addEventListener('mouseenter', () => el.querySelector('.overlay-3d').style.opacity = '1');
        el.addEventListener('mouseleave', () => el.querySelector('.overlay-3d').style.opacity = '0');
    });
}

// ==========================================
// 4. CARRITO & PAGOS
// ==========================================

function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    if(!product) return;

    const existing = cart.find(i => i.id === id);
    const currentQty = existing ? existing.quantity : 0;

    // Validación estricta de stock
    if(currentQty >= product.stock) {
        alert('¡Lo sentimos! No hay más unidades disponibles de este modelo.');
        return;
    }

    if(existing) existing.quantity++;
    else cart.push({...product, quantity: 1});

    // Actualizar todo
    updateCartUI();
    renderProducts(allProducts); // IMPORTANTE: Redibuja el catálogo para bajar el stock visual
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
    renderProducts(allProducts); // Devuelve el stock visual
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    
    if(count) {
        count.textContent = totalItems;
        count.style.display = totalItems > 0 ? 'block' : 'none';
    }

    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if(!list || !totalEl) return;

    if(!cart.length) {
        list.innerHTML = '<div class="text-center py-4 text-muted"><i class="fa-solid fa-car-side fa-2x mb-2"></i><br>Tu garaje está vacío.</div>';
        totalEl.textContent = '$0.00';
        return;
    }

    let total = 0;
    list.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
        <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-2">
            <div class="text-truncate" style="max-width: 60%;">
                <div class="text-white small fw-bold">${item.name}</div>
                <div class="text-muted x-small">$${item.price.toLocaleString()} x ${item.quantity}</div>
            </div>
            <div class="d-flex align-items-center">
                <span class="text-danger fw-bold me-2 small">$${(item.price * item.quantity).toLocaleString()}</span>
                <button onclick="removeFromCart(${item.id})" class="btn btn-sm btn-link text-secondary p-0"><i class="fa fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
    totalEl.textContent = `$${total.toLocaleString()}`;
}

// Lógica de Pagos
function openPaymentModal() {
    if(!cart.length) return alert('El carrito está vacío');
    const token = localStorage.getItem('token');
    if(!token) {
        alert("Debes iniciar sesión para comprar.");
        window.location.href = 'login.html';
        return;
    }
    
    const cartModalEl = document.getElementById('cartModal');
    const payModalEl = document.getElementById('paymentModal');
    
    // Cerrar carrito y abrir pago usando Bootstrap API
    const cartModal = bootstrap.Modal.getInstance(cartModalEl);
    if(cartModal) cartModal.hide();
    
    const payModal = new bootstrap.Modal(payModalEl);
    payModal.show();
}

function setupPaymentValidation() {
    // Formulario Tarjeta
    const cardForm = document.getElementById('card-form');
    if(cardForm) {
        cardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const num = document.getElementById('cc-number').value.replace(/\D/g,'');
            const cvv = document.getElementById('cc-cvv').value;
            
            // Algoritmo de Luhn Simplificado
            if(num.length < 13 || !luhnCheck(num)) {
                alert('Tarjeta Inválida (Verificación bancaria fallida)');
                return;
            }
            if(cvv.length < 3) return alert('CVV inválido');
            
            processOrder('Tarjeta Crédito/Débito');
        });
    }

    // Formulario Nequi
    const nequiForm = document.getElementById('nequi-form');
    if(nequiForm) {
        nequiForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('nequi-phone').value;
            if(phone.length !== 10 || !phone.startsWith('3')) {
                alert('Número Nequi inválido (Debe ser celular Colombia 10 dígitos)');
                return;
            }
            processOrder('Nequi');
        });
    }
}

function luhnCheck(val) {
    let sum = 0;
    for (let i = 0; i < val.length; i++) {
        let intVal = parseInt(val.substr(i, 1));
        if (i % 2 == 0) {
            intVal *= 2;
            if (intVal > 9) intVal = 1 + (intVal % 10);
        }
        sum += intVal;
    }
    return (sum % 10) == 0;
}

async function processOrder(method) {
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const items = cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price }));
    
    // Simular carga
    alert('Procesando pago seguro...');
    
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ items, total })
        });
        
        if(res.ok) {
            alert(`✅ ¡PAGO APROBADO!\nMétodo: ${method}\nTu pedido ha sido enviado al almacén.`);
            cart = [];
            updateCartUI();
            window.location.reload();
        } else {
            const err = await res.json();
            alert(`Error: ${err.message}`);
        }
    } catch(e) { alert('Error de red al procesar el pago.'); }
}

// ==========================================
// 5. VISOR 3D
// ==========================================

window.open3D = (name) => {
    const modalEl = document.getElementById('view3DModal');
    const viewer = document.getElementById('modal-viewer-3d');
    
    // Usamos un modelo de auto real (Buggy GLTF de ejemplo público)
    // Si tuvieras modelos propios, aquí harías un switch(name) para elegir el archivo
    viewer.src = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Buggy/glTF-Binary/Buggy.glb";
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}