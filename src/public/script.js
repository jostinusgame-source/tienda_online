const API_URL = '/api'; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;
let itiInstance = null; // Instancia global para el validador telefónico

// ==========================================
// 1. INICIALIZACIÓN GLOBAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();

    // Detectar en qué página estamos y cargar lo necesario
    const storeContainer = document.getElementById('products-container');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const reviewForm = document.getElementById('reviewForm');

    if (storeContainer) initStore();
    if (registerForm) initStrictRegister();
    if (loginForm) initLogin();
    if (reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);
});

// ==========================================
// 2. SISTEMA DE REGISTRO "ULTRA ESTRICTO"
// ==========================================
function initStrictRegister() {
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const passInput = document.getElementById('reg-pass');
    const form = document.getElementById('register-form');
    const msg = document.getElementById('msg');

    // 2.1 Configuración de Intl-Tel-Input (Librería Profesional)
    if (phoneInput) {
        itiInstance = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js", // Validador de Google
            separateDialCode: true,
            initialCountry: "auto",
            geoIpLookup: callback => {
                fetch("https://ipapi.co/json")
                .then(res => res.json())
                .then(data => callback(data.country_code))
                .catch(() => callback("co"));
            },
            preferredCountries: ["co", "mx", "us", "es", "ar", "cl", "pe"],
        });

        // Limpiar error al escribir
        phoneInput.addEventListener('input', () => {
            phoneInput.classList.remove('is-invalid');
            document.getElementById('phone-error').style.display = 'none';
        });
    }

    // 2.2 Listeners de Validación en Tiempo Real (Blur)
    if(nameInput) nameInput.addEventListener('blur', () => validateField('name', nameInput));
    if(emailInput) emailInput.addEventListener('blur', () => validateField('email', emailInput));
    if(phoneInput) phoneInput.addEventListener('blur', () => validateField('phone', phoneInput));

    // 2.3 Envío del Formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            msg.innerText = "";

            // Ejecutar validaciones finales
            const vName = validateField('name', nameInput);
            const vEmail = validateField('email', emailInput);
            const vPhone = validateField('phone', phoneInput);
            
            // Validación Contraseña Estricta
            const passVal = passInput.value;
            // Regex: Min 10 chars, 1 Mayúscula, 1 Número, 1 Caracter Especial
            const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
            
            if(!passRegex.test(passVal)) {
                alert("SEGURIDAD: La contraseña debe tener al menos 10 caracteres, una mayúscula, un número y un símbolo.");
                passInput.focus();
                return;
            }

            if (!vName || !vEmail || !vPhone) {
                msg.innerHTML = '<span class="text-danger fw-bold">Por favor, corrige los campos marcados en rojo.</span>';
                return;
            }

            // Obtener datos limpios
            const fullPhone = itiInstance.getNumber(); // Número completo (+57300...)

            try {
                msg.innerHTML = '<span class="text-warning">Verificando credenciales...</span>';
                
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        password: passVal,
                        phone: fullPhone
                    })
                });

                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    msg.innerHTML = '<span class="text-success fw-bold">¡Registro Exitoso! Redirigiendo...</span>';
                    setTimeout(() => window.location.href = 'index.html', 2000);
                } else {
                    msg.innerHTML = `<span class="text-danger fw-bold">${data.message || 'Error en el registro.'}</span>`;
                }
            } catch (err) {
                msg.innerHTML = '<span class="text-danger">Error de conexión con el servidor.</span>';
            }
        });
    }
}

// 2.4 Lógica Central de Validaciones (El "Core" de Seguridad)
function validateField(type, input) {
    const val = input.value.trim();
    let isValid = true;
    let errorMsg = "";
    const errorDiv = document.getElementById(`${type}-error`);
    
    // --- VALIDACIÓN NOMBRE ---
    if (type === 'name') {
        const words = val.split(/\s+/).filter(w => w.length > 0);
        const forbiddenWords = ["jeje", "jojo", "jaja", "admin", "test", "prueba", "null", "undefined", "user", "usuario"];

        // Regla 1: Mínimo 1 palabra, Máximo 3 palabras
        if (words.length < 1 || words.length > 3) {
            isValid = false; errorMsg = "El nombre debe tener entre 1 y 3 palabras.";
        } 
        // Regla 2: Ninguna palabra repetida ("Juan Juan")
        else if (new Set(words.map(w => w.toLowerCase())).size !== words.length) {
            isValid = false; errorMsg = "No repitas palabras en el nombre.";
        }
        else {
            for (let word of words) {
                // Regla 3: Solo alfabeto estándar (sin números, sin emojis)
                if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ]+$/.test(word)) {
                    isValid = false; errorMsg = "Usa solo letras válidas (sin números ni símbolos)."; break;
                }
                // Regla 4: NO letras seguidas iguales ("Aanna", "Carlosss")
                // Excepción posible: Nombres reales como 'Aaron' o 'Ll' en español si quisieras, 
                // pero pediste estricto: "no se permiten dos letras seguidas iguales".
                if (/(.)\1/.test(word.toLowerCase())) {
                    isValid = false; errorMsg = `Formato inválido en "${word}" (letras repetidas consecutivas).`; break;
                }
                // Regla 5: Palabras prohibidas
                if (forbiddenWords.includes(word.toLowerCase())) {
                    isValid = false; errorMsg = "Nombre no permitido."; break;
                }
            }
        }
    } 
    
    // --- VALIDACIÓN CORREO ---
    else if (type === 'email') {
        // Regla: Regex estricto + Mínimo 3 chars antes del @
        const strictEmailRegex = /^([a-zA-Z0-9._%-]{3,})@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
        
        if (!strictEmailRegex.test(val)) {
            isValid = false; errorMsg = "Correo inválido (Mín. 3 letras antes del @).";
        } else {
            // Regla: Rechazar correos temporales conocidos
            const domain = val.split('@')[1];
            const tempDomains = ['yopmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com'];
            if (tempDomains.includes(domain)) {
                isValid = false; errorMsg = "No se permiten correos temporales.";
            }
        }
    } 
    
    // --- VALIDACIÓN TELÉFONO ---
    else if (type === 'phone') {
        if (!itiInstance) return false;

        // Regla 1: Validación estricta de la librería (longitud y prefijo por país)
        if (!itiInstance.isValidNumber()) {
            isValid = false;
            const errorCode = itiInstance.getValidationError();
            const errorMap = ["Número inválido", "Código de país inválido", "Muy corto", "Muy largo", "Número inválido"];
            errorMsg = errorMap[errorCode] || "Número no válido para este país.";
        } 
        else {
            // Regla 2: Bloqueo manual de patrones sospechosos (ej: 3000000000)
            const rawNumber = val.replace(/\D/g, ''); // Solo dígitos
            if (/^(\d)\1+$/.test(rawNumber)) { // Chequea si todos los dígitos son iguales
                isValid = false; errorMsg = "Número ficticio detectado.";
            }
        }
    }

    // Actualización Visual (UI)
    if (!isValid) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        if (errorDiv) {
            errorDiv.innerText = errorMsg;
            errorDiv.style.display = 'block';
        }
    } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        if (errorDiv) errorDiv.style.display = 'none';
    }

    return isValid;
}

// ==========================================
// 3. TIENDA ECOMMERCE (Lógica visual y datos)
// ==========================================
async function initStore() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');

    try {
        const res = await fetch(`${API_URL}/store/products`);
        if (!res.ok) throw new Error("Error API");
        
        allProducts = await res.json();
        
        if (loader) loader.classList.add('d-none');
        if (container) container.classList.remove('d-none');
        renderProducts('all');

        // Filtros de Categoría
        document.querySelectorAll('#category-filters button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderProducts(e.target.dataset.filter);
            });
        });
        
        // Buscador
        const searchInput = document.getElementById('search-input');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
                renderProducts(null, filtered);
            });
        }

    } catch (e) {
        if(loader) loader.innerHTML = '<h3 class="text-danger text-center">Error de conexión. Verifica el servidor.</h3>';
    }
}

function renderProducts(filter, list = null) {
    const container = document.getElementById('products-container');
    if(!container) return;

    let final = list || (filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter));

    if (final.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted mt-5"><h3>No hay items disponibles.</h3></div>';
        return;
    }

    container.innerHTML = final.map(p => {
        const img = p.image_url || 'https://via.placeholder.com/600x400?text=No+Image';
        const isOut = p.stock <= 0;

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card bg-dark text-white border-secondary h-100 shadow product-card hover-scale" 
                 style="cursor: pointer;" onclick="openModal(${p.id})">
                
                <div class="position-relative overflow-hidden" style="height: 250px;">
                    <img src="${img}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category}</div>
                    ${isOut ? '<div class="overlay-sold d-flex align-items-center justify-content-center"><span>AGOTADO</span></div>' : ''}
                </div>
                
                <div class="card-body d-flex flex-column">
                    <h5 class="fw-bold text-uppercase mb-1 text-truncate">${p.name}</h5>
                    <small class="text-muted mb-3 text-truncate">${p.description || 'Sin descripción'}</small>
                    
                    <div class="mt-auto d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                        <span class="fs-4 fw-bold text-danger">$${parseFloat(p.price).toFixed(2)}</span>
                        <button class="btn btn-danger btn-sm rounded-circle p-2 shadow" 
                                onclick="event.stopPropagation(); addToCart(${p.id})" 
                                ${isOut ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 4. MODAL DETALLE Y 3D
// ==========================================
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    
    currentProductModalId = id;
    const price = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerText = price;
    document.getElementById('modal-p-stock').innerText = p.stock > 0 ? `Stock: ${p.stock} unidades` : "Agotado";
    
    const container = document.getElementById('visual-container');
    if(p.model_url && p.model_url.includes('sketchfab')) {
        container.innerHTML = `
            <div class="ratio ratio-16x9 border border-secondary rounded shadow-lg">
                <iframe src="${p.model_url}" title="${p.name}" frameborder="0" allow="autoplay; fullscreen; vr"></iframe>
            </div>
            <p class="text-center text-muted small mt-2"><i class="fa-solid fa-hand-pointer"></i> Arrastra para rotar en 360°</p>
        `;
    } else {
        container.innerHTML = `<img src="${p.image_url}" class="img-fluid rounded border border-secondary shadow-lg w-100">`;
    }

    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

// ==========================================
// 5. CHECKOUT Y PDF
// ==========================================
window.checkout = function() {
    if(!window.jspdf) return alert("Error cargando librería PDF");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    const date = new Date().toLocaleDateString();
    
    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30); doc.setTextColor("#b71c1c"); // Rojo oscuro
    doc.text("RECIBO DE COMPRA", 20, 25);
    
    // Info Cliente
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text("SpeedCollect Inc.", 20, 35);
    doc.text(`Fecha: ${date}`, 20, 40);
    doc.text(`Cliente: ${user.name}`, 20, 50);
    doc.text(`Email: ${user.email}`, 20, 55);

    // Tabla
    const tableBody = cart.map(item => [
        item.quantity,
        item.name,
        `$${item.price.toFixed(2)}`,
        `$${(item.price * item.quantity).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 65,
        head: [['CANT.', 'ITEM', 'PRECIO', 'SUBTOTAL']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [183, 28, 28] }
    });

    // Totales
    let finalY = doc.lastAutoTable.finalY + 10;
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PAGADO: $${total.toFixed(2)} USD`, 120, finalY);

    // Guardar
    doc.save(`Recibo_SpeedCollect_${Date.now()}.pdf`);
    
    // Limpiar
    cart = [];
    localStorage.removeItem('cart');
    updateCartUI();
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    alert("¡Compra Exitosa! Recibo descargado.");
}

// ==========================================
// 6. AUTENTICACIÓN Y LOGIN
// ==========================================
function checkAuthStatus() {
    const u = JSON.parse(localStorage.getItem('user'));
    const div = document.getElementById('auth-section');
    
    if(div && u) {
        const adminBadge = u.role === 'admin' ? '<span class="badge bg-warning text-dark me-2">ADMIN</span>' : '';
        div.innerHTML = `
            <div class="d-flex align-items-center">
                ${adminBadge}
                <div class="dropdown">
                    <button class="btn btn-outline-light btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="fa-solid fa-user-astronaut"></i> ${u.name.split(' ')[0]}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark shadow">
                        <li><button onclick="logout()" class="dropdown-item text-danger"><i class="fa-solid fa-power-off"></i> Salir</button></li>
                    </ul>
                </div>
            </div>`;
    }
}

function initLogin() {
    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const msg = document.getElementById('msg');
        msg.innerHTML = 'Conectando...';
        
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
                window.location.href = d.user.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                msg.innerHTML = `<span class="text-danger">${d.message}</span>`;
            }
        } catch(err) { msg.innerHTML = 'Error de conexión.'; }
    });
}

function logout() { localStorage.clear(); location.href = 'index.html'; }

// ==========================================
// 7. CARRITO Y FUNCIONES AUXILIARES
// ==========================================
window.openPaymentModal = function() {
    const token = localStorage.getItem('token');
    if(!token) {
        new bootstrap.Modal(document.getElementById('loginRequiredModal')).show();
        return;
    }
    if(cart.length === 0) return alert("Carrito Vacío");
    
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = cart.map(i => {
        total += i.price * i.quantity;
        return `
        <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-2">
            <span>${i.quantity}x ${i.name}</span>
            <span class="text-success fw-bold">$${(i.price * i.quantity).toFixed(2)}</span>
        </div>`;
    }).join('');
    
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)} USD`;
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}

window.addToCart = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(p) {
        const item = cart.find(i => i.id === id);
        if(item) item.quantity++; else cart.push({...p, quantity: 1});
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        
        // Toast Notificación
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 start-50 translate-middle-x p-3 mb-3 bg-success text-white rounded shadow';
        toast.style.zIndex = '2000';
        toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> Agregado: ${p.name}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}

function updateCartUI() {
    const el = document.getElementById('cart-count');
    if(el) {
        const q = cart.reduce((a,b)=>a+b.quantity,0);
        el.innerText = q;
        el.style.display = q > 0 ? 'block' : 'none';
    }
}

// ==========================================
// 8. RESEÑAS
// ==========================================
async function loadReviews(pid) {
    const c = document.getElementById('reviewsContainer');
    c.innerHTML = '<small class="text-muted">Cargando...</small>';
    try {
        const res = await fetch(`${API_URL}/products/${pid}/reviews`);
        const reviews = await res.json();
        
        if(!reviews || reviews.length === 0) {
            c.innerHTML = '<small class="text-muted fst-italic">Sé el primero en opinar.</small>';
            return;
        }
        
        c.innerHTML = reviews.map(r => `
            <div class="border border-secondary rounded p-2 mb-2 bg-dark">
                <div class="d-flex justify-content-between">
                    <strong class="text-danger small">${r.user_name}</strong>
                    <span class="text-warning small">${'★'.repeat(r.rating)}</span>
                </div>
                <p class="text-light small mb-0 mt-1">${r.comment}</p>
            </div>
        `).join('');
    } catch(e) { c.innerHTML = '<small class="text-danger">Error cargando reseñas.</small>'; }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if(!token) return alert("Inicia sesión para opinar.");
    
    const textIn = document.getElementById('review-comment');
    const rateIn = document.getElementById('review-rating');
    
    if(!textIn.value.trim()) return alert("El comentario no puede estar vacío.");

    try {
        const res = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({
                productId: currentProductModalId,
                rating: rateIn.value,
                comment: textIn.value
            })
        });

        if(res.ok) {
            loadReviews(currentProductModalId);
            textIn.value = '';
        } else {
            alert("Error al guardar la reseña.");
        }
    } catch(err) { console.error(err); }
}