/**
 * SPEEDCOLLECT | OFFICIAL SCRIPT
 * Version: 2.5 (High-End Edition)
 */

const API_URL = '/api'; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;
let itiInstance = null; // Instancia del validador de teléfonos

// ==========================================
// CONFIGURACIÓN ADMIN Y OFERTAS
// ==========================================
const ADMIN_EMAIL = "jsusgamep@itc.edu.co"; // TU CORREO DE ADMIN (ÚNICO)
const DISCOUNT_RATE = 0.20; // 20% de descuento
let isOfferActive = false; // Estado de la oferta flash

// ==========================================
// 1. INICIALIZACIÓN GLOBAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión y cargar UI inicial
    checkAuthStatus();
    updateCartUI();
    initChatbot(); // Iniciar Chatbot flotante

    // Detectar elementos para saber en qué página estamos
    const storeContainer = document.getElementById('products-container');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const reviewForm = document.getElementById('reviewForm');
    const countdownEl = document.getElementById('seconds');

    // Inicializadores por página
    if (storeContainer) {
        initStore();
        if(countdownEl) startCountdown(); // Iniciar contador solo en tienda
    }
    
    if (registerForm) initStrictRegister();
    if (loginForm) initLogin();
    
    // Listener global para reseñas
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
});

// ==========================================
// 2. LÓGICA DE ADMIN Y OFERTA FLASH
// ==========================================
function checkAdminRole(user) {
    const crown = document.getElementById('admin-crown');
    // Mostrar la corona SOLO si el usuario existe y su correo coincide con el del admin
    if (crown && user && user.email === ADMIN_EMAIL) {
        crown.style.display = 'block'; 
        // Efecto visual extra
        document.body.classList.add('admin-mode');
    }
}

function startCountdown() {
    // TIEMPO DE LA OFERTA (Ejemplo: 10 minutos = 600 segundos)
    let time = 600; 
    
    const interval = setInterval(() => {
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = time % 60;

        const hEl = document.getElementById('hours');
        const mEl = document.getElementById('minutes');
        const sEl = document.getElementById('seconds');

        if(hEl) hEl.innerText = h < 10 ? '0'+h : h;
        if(mEl) mEl.innerText = m < 10 ? '0'+m : m;
        if(sEl) sEl.innerText = s < 10 ? '0'+s : s;

        if (time <= 0) {
            clearInterval(interval);
            activateFlashSale();
        }
        time--;
    }, 1000);
}

function activateFlashSale() {
    isOfferActive = true;
    
    // Notificación visual elegante
    const banner = document.getElementById('offers');
    if(banner) {
        banner.classList.add('animate__animated', 'animate__pulse');
        banner.style.border = "2px solid #00ff00"; // Borde verde hacker
    }

    alert("⚡ ¡TIEMPO AGOTADO! PRECIOS REDUCIDOS UN 20% EN TODA LA TIENDA ⚡");
    
    // Re-renderizar productos con nuevos precios
    renderProducts('all');
}

// ==========================================
// 3. CHATBOT INTELIGENTE (BÁSICO)
// ==========================================
function initChatbot() {
    const trigger = document.getElementById('chatTrigger');
    const widget = document.getElementById('chatWidget');
    const close = document.getElementById('closeChat');
    const send = document.getElementById('sendChat');
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');

    if(!trigger) return;

    // Abrir/Cerrar
    trigger.onclick = () => { widget.style.display = 'flex'; trigger.style.display = 'none'; };
    close.onclick = () => { widget.style.display = 'none'; trigger.style.display = 'flex'; };

    // Lógica de respuesta del Bot
    const botReply = (txt) => {
        let msg = "Soy SpeedBot. Para atención personalizada, usa el botón de WhatsApp.";
        const t = txt.toLowerCase();
        
        if(t.includes('precio') || t.includes('costo') || t.includes('valor')) 
            msg = "Los precios varían según la exclusividad del modelo. Revisa el catálogo arriba.";
        
        else if(t.includes('envio') || t.includes('domicilio') || t.includes('entregas')) 
            msg = "Realizamos envíos seguros a toda Colombia. Bogotá: 24h, Nacionales: 2-3 días.";
        
        else if(t.includes('ubicacion') || t.includes('donde') || t.includes('tienda')) 
            msg = "Nuestro Showroom principal está en Bogotá: Calle 93B #13-42, Torre Eko.";
        
        else if(t.includes('admin') || t.includes('corona')) 
            msg = "El acceso administrativo requiere credenciales cifradas y autorización de nivel 5.";
        
        else if(t.includes('oferta') || t.includes('descuento') || t.includes('promocion')) 
            msg = "¡Espera a que el contador llegue a cero! Se activará un 20% de descuento automático.";
        
        else if(t.includes('hola') || t.includes('buenos')) 
            msg = "¡Hola! Bienvenido al concesionario digital número 1 de coleccionables.";

        // Simular tiempo de escritura
        setTimeout(() => {
            body.innerHTML += `<div class="msg msg-bot text-white animate__animated animate__fadeIn">${msg}</div>`;
            body.scrollTop = body.scrollHeight;
        }, 800);
    };

    const sendMsg = () => {
        const val = input.value.trim();
        if(!val) return;
        
        // Mensaje usuario
        body.innerHTML += `<div class="msg msg-user text-white animate__animated animate__fadeInRight">${val}</div>`;
        input.value = '';
        body.scrollTop = body.scrollHeight;
        
        // Respuesta bot
        botReply(val);
    };

    send.onclick = sendMsg;
    input.onkeypress = (e) => { if(e.key === 'Enter') sendMsg(); };
}

// ==========================================
// 4. REGISTRO BANCARIO ESTRICTO
// ==========================================
function initStrictRegister() {
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const passInput = document.getElementById('reg-pass');
    const form = document.getElementById('register-form');
    const msg = document.getElementById('msg');

    // 4.1 Configurar Librería de Teléfonos
    if (phoneInput) {
        itiInstance = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            separateDialCode: true,
            initialCountry: "auto",
            geoIpLookup: callback => fetch("https://ipapi.co/json")
                .then(r=>r.json())
                .then(d=>callback(d.country_code))
                .catch(()=>callback("co")),
            preferredCountries: ["co", "mx", "us", "es"]
        });
        
        // Limpiar error al escribir
        phoneInput.addEventListener('input', () => { 
            phoneInput.classList.remove('is-invalid'); 
            const errDiv = document.getElementById('phone-error');
            if(errDiv) errDiv.style.display='none'; 
        });
    }

    // 4.2 Listeners de Validación (Blur)
    if(nameInput) nameInput.addEventListener('blur', () => validateField('name', nameInput));
    if(emailInput) emailInput.addEventListener('blur', () => validateField('email', emailInput));
    if(phoneInput) phoneInput.addEventListener('blur', () => validateField('phone', phoneInput));

    // 4.3 Envío del Formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            msg.innerText = "";
            
            const vName = validateField('name', nameInput);
            const vEmail = validateField('email', emailInput);
            const vPhone = validateField('phone', phoneInput);
            const passVal = passInput.value;
            
            // Regex Contraseña Estricta
            const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;

            if(!passRegex.test(passVal)) { 
                alert("SEGURIDAD: La contraseña es muy débil.\nRequisitos: Mínimo 10 caracteres, 1 Mayúscula, 1 Número, 1 Símbolo."); 
                return; 
            }
            
            if (!vName || !vEmail || !vPhone) { 
                msg.innerHTML = '<span class="text-danger fw-bold">Por favor, corrige los campos marcados en rojo.</span>'; 
                return; 
            }

            const fullPhone = itiInstance.getNumber();

            try {
                msg.innerHTML = '<span class="text-warning">Validando credenciales...</span>';
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
                    msg.innerHTML = '<span class="text-success fw-bold">¡Bienvenido al Club! Redirigiendo...</span>';
                    setTimeout(() => window.location.href = 'index.html', 2000);
                } else {
                    msg.innerHTML = `<span class="text-danger">${data.message}</span>`;
                }
            } catch (err) { 
                msg.innerHTML = '<span class="text-danger">Error de Servidor. Intenta más tarde.</span>'; 
            }
        });
    }
}

function validateField(type, input) {
    const val = input.value.trim();
    let isValid = true; 
    let errorMsg = "";
    const errorDiv = document.getElementById(`${type}-error`);
    
    if (type === 'name') {
        const words = val.split(/\s+/).filter(w => w.length > 0);
        // Regla: 1 a 3 palabras
        if (words.length < 1 || words.length > 3) { isValid = false; errorMsg = "Debe tener entre 1 y 3 palabras."; } 
        // Regla: No palabras repetidas
        else if (new Set(words.map(w => w.toLowerCase())).size !== words.length) { isValid = false; errorMsg = "No repitas palabras."; }
        else {
            for (let word of words) {
                // Regla: Solo letras
                if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ]+$/.test(word)) { isValid = false; errorMsg = "Solo se permiten letras."; break; }
                // Regla: No caracteres repetidos consecutivos
                if (/(.)\1/.test(word.toLowerCase())) { isValid = false; errorMsg = `Letras repetidas inválidas en "${word}".`; break; }
                // Regla: Palabras prohibidas
                if (["jeje", "jojo", "prueba", "admin"].includes(word.toLowerCase())) { isValid = false; errorMsg = "Nombre no permitido."; break; }
            }
        }
    } else if (type === 'email') {
        // Regla: Regex email estricto + min 3 chars antes del @
        if (!/^([a-zA-Z0-9._%-]{3,})@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(val)) { isValid = false; errorMsg = "Correo inválido (Mín 3 letras antes del @)."; }
    } else if (type === 'phone') {
        // Regla: Librería + Anti spam
        if (!itiInstance || !itiInstance.isValidNumber()) { isValid = false; errorMsg = "Número inválido para este país."; }
        else if (/^(\d)\1+$/.test(val.replace(/\D/g, ''))) { isValid = false; errorMsg = "Número ficticio detectado."; }
    }

    if (!isValid) { 
        input.classList.add('is-invalid'); 
        if(errorDiv) { errorDiv.innerText = errorMsg; errorDiv.style.display = 'block'; } 
    } else { 
        input.classList.remove('is-invalid'); 
        input.classList.add('is-valid'); 
        if(errorDiv) errorDiv.style.display = 'none'; 
    }
    return isValid;
}

// ==========================================
// 5. TIENDA ECOMMERCE (CON PRECIOS DINÁMICOS)
// ==========================================
async function initStore() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    
    try {
        const res = await fetch(`${API_URL}/store/products`);
        if (!res.ok) throw new Error("API Error");
        allProducts = await res.json();
        
        if (loader) loader.classList.add('d-none');
        if (container) container.classList.remove('d-none');
        renderProducts('all');

        // Filtros
        document.querySelectorAll('#category-filters button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderProducts(e.target.dataset.filter);
            });
        });
        
        // Buscador
        const si = document.getElementById('search-input');
        if(si) {
            si.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
                renderProducts(null, filtered);
            });
        }
    } catch (e) { 
        if(loader) loader.innerHTML = '<h3 class="text-danger text-center">Sistema Offline. Intenta recargar.</h3>'; 
    }
}

function renderProducts(filter, list = null) {
    const container = document.getElementById('products-container');
    if(!container) return;
    
    let final = list || (filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter));

    if(final.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted"><h3>No hay items disponibles.</h3></div>';
        return;
    }

    container.innerHTML = final.map(p => {
        const img = p.image_url || 'https://via.placeholder.com/600x400?text=No+Image';
        const isOut = p.stock <= 0;
        
        // --- LÓGICA DE PRECIO VISUAL ---
        let originalPrice = parseFloat(p.price);
        let finalPrice = originalPrice;
        
        // HTML por defecto
        let priceHtml = `<span class="fs-4 fw-bold text-white">$${originalPrice.toFixed(2)}</span>`;

        // Si la oferta está activa, calculamos descuento
        if (isOfferActive) {
            finalPrice = originalPrice * (1 - DISCOUNT_RATE);
            priceHtml = `
                <div class="d-flex flex-column align-items-start">
                    <span class="offer-old-price small">$${originalPrice.toFixed(2)}</span>
                    <span class="offer-active-price">$${finalPrice.toFixed(2)}</span>
                </div>
            `;
        }

        return `
        <div class="col-md-6 col-lg-4 mb-4 animate__animated animate__fadeIn">
            <div class="card bg-black text-white border-secondary h-100 shadow product-card" onclick="openModal(${p.id})">
                
                <div class="position-relative overflow-hidden" style="height: 250px;">
                    <img src="${img}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category}</div>
                    ${isOut ? '<div class="overlay-sold d-flex align-items-center justify-content-center"><span>AGOTADO</span></div>' : ''}
                </div>
                
                <div class="card-body d-flex flex-column">
                    <h5 class="fw-bold text-uppercase mb-1 text-truncate">${p.name}</h5>
                    <small class="text-silver mb-3 text-truncate">${p.description || 'Sin descripción'}</small>
                    
                    <div class="mt-auto d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                        ${priceHtml}
                        <button class="btn btn-outline-danger btn-sm rounded-circle p-2 shadow" 
                                onclick="event.stopPropagation(); addToCart(${p.id}, ${finalPrice})" 
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
// 6. FUNCIONES AUXILIARES (MODAL, CART, CHECKOUT)
// ==========================================
window.openModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    currentProductModalId = id;
    
    // Calcular precio para el modal
    let price = parseFloat(p.price);
    let htmlPrice = `<span class="text-danger fw-bold">$${price.toFixed(2)}</span>`;
    
    if(isOfferActive) {
        let disc = price * (1 - DISCOUNT_RATE);
        htmlPrice = `
            <span class="text-decoration-line-through text-muted me-2 fs-5">$${price.toFixed(2)}</span> 
            <span class="text-success fw-bold fs-2">$${disc.toFixed(2)}</span>
        `;
    }

    document.getElementById('modal-p-name').innerText = p.name;
    document.getElementById('modal-p-desc').innerText = p.description;
    document.getElementById('modal-p-price').innerHTML = htmlPrice;
    document.getElementById('modal-p-stock').innerText = p.stock > 0 ? `Stock: ${p.stock} unidades` : "Agotado";
    
    // Visor 3D o Imagen
    const container = document.getElementById('visual-container');
    container.innerHTML = (p.model_url && p.model_url.includes('sketchfab')) 
        ? `<div class="ratio ratio-16x9 border border-secondary shadow"><iframe src="${p.model_url}" frameborder="0" allow="autoplay; fullscreen; vr"></iframe></div>`
        : `<img src="${p.image_url}" class="img-fluid rounded border border-secondary w-100 shadow">`;
        
    loadReviews(id);
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

// Añadir al carrito (Soporta precio sobreescrito por oferta)
window.addToCart = function(id, priceOverride) {
    const p = allProducts.find(x => x.id === id);
    if(p) {
        const item = cart.find(i => i.id === id);
        // Usar precio de oferta si aplica, o el normal
        const finalP = priceOverride || (isOfferActive ? p.price * (1 - DISCOUNT_RATE) : p.price);
        
        if(item) {
            item.quantity++;
        } else {
            cart.push({...p, price: finalP, quantity: 1}); // Guarda el precio exacto
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        
        // Notificación Toast Simple
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 start-50 translate-middle-x p-3 mb-3 bg-success text-white rounded shadow';
        toast.style.zIndex = '3000';
        toast.innerHTML = `<i class="fa-solid fa-check"></i> ${p.name} añadido al garaje`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}

// Generar PDF Recibo
window.checkout = function() {
    if(!window.jspdf) return alert("Error cargando librería PDF");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Estilo Dark Mode PDF
    doc.setFillColor(10, 10, 10); 
    doc.rect(0, 0, 210, 297, 'F'); // Fondo negro
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(22); 
    doc.text("SPEEDCOLLECT | RECEIPT", 20, 20);
    
    doc.setFontSize(10); 
    doc.text(`Cliente VIP: ${user.name}`, 20, 35);
    doc.text(`Email: ${user.email}`, 20, 40);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 45);

    const body = cart.map(i => [
        i.quantity, 
        i.name, 
        `$${i.price.toFixed(2)}`, 
        `$${(i.price*i.quantity).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 55, 
        head: [['Cant', 'Item', 'Precio Unit', 'Total']], 
        body: body,
        theme: 'grid', 
        styles: {
            fillColor: [30, 30, 30], 
            textColor: 255, 
            lineColor: [200, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [200, 0, 0], // Rojo encabezado
            textColor: 255,
            fontStyle: 'bold'
        }
    });

    let total = cart.reduce((a,b)=>a+(b.price*b.quantity),0);
    doc.setTextColor(0, 255, 65); // Verde Neon
    doc.setFontSize(16);
    doc.text(`TOTAL PAGADO: $${total.toFixed(2)} USD`, 130, doc.lastAutoTable.finalY + 15);
    
    doc.save(`Recibo_SpeedCollect_${Date.now()}.pdf`);
    
    // Limpiar
    cart = []; 
    localStorage.removeItem('cart'); 
    updateCartUI();
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    alert("¡Pago Exitoso! Tu recibo se ha descargado.");
}

// ==========================================
// 7. AUTENTICACIÓN
// ==========================================
function checkAuthStatus() {
    const u = JSON.parse(localStorage.getItem('user'));
    const div = document.getElementById('auth-section');
    if(div && u) {
        checkAdminRole(u); // Chequear si mostramos la corona
        div.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light btn-sm dropdown-toggle fw-bold" data-bs-toggle="dropdown">
                    <i class="fa-solid fa-user-astronaut"></i> ${u.name.split(' ')[0]}
                </button>
                <ul class="dropdown-menu dropdown-menu-dark shadow">
                    <li><button onclick="logout()" class="dropdown-item text-danger"><i class="fa-solid fa-power-off"></i> Cerrar Sesión</button></li>
                </ul>
            </div>`;
    }
}

function initLogin() {
    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const msg = document.getElementById('msg');
        msg.innerText = "Conectando...";

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
            } else {
                msg.innerHTML = `<span class="text-danger">${d.message}</span>`;
            }
        } catch(err) { 
            msg.innerText = 'Error de conexión.'; 
        }
    });
}

function logout() { 
    localStorage.clear(); 
    location.href = 'index.html'; 
}

function updateCartUI() { 
    const el = document.getElementById('cart-count'); 
    if(el) {
        const q = cart.reduce((a,b)=>a+b.quantity,0);
        el.innerText = q;
        el.style.display = cart.length ? 'block' : 'none'; 
    }
}

window.openPaymentModal = function() {
    const token = localStorage.getItem('token');
    if(!token) {
        new bootstrap.Modal(document.getElementById('loginRequiredModal')).show();
        return;
    }
    const list = document.getElementById('cart-items');
    let total = 0;
    
    if(cart.length === 0) {
        list.innerHTML = '<p class="text-center text-muted">El carrito está vacío.</p>';
    } else {
        list.innerHTML = cart.map(i => { 
            total += i.price * i.quantity; 
            return `
            <div class="d-flex justify-content-between mb-2 border-bottom border-secondary pb-1">
                <span>${i.quantity}x ${i.name}</span>
                <span class="text-success fw-bold">$${(i.price*i.quantity).toFixed(2)}</span>
            </div>`; 
        }).join('');
    }
    
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
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
                <p class="text-white small mb-0 mt-1">${r.comment}</p>
            </div>
        `).join('');
    } catch(e) { 
        c.innerHTML = '<small class="text-danger">Error cargando reseñas.</small>'; 
    }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if(!token) return alert("Debes iniciar sesión para opinar.");
    
    const textIn = document.getElementById('review-comment');
    const rateIn = document.getElementById('review-rating') || {value: 5}; // Default 5 estrellas si no existe el select
    
    if(!textIn.value.trim()) return alert("El comentario no puede estar vacío.");

    try {
        const res = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({
                productId: currentProductModalId,
                rating: rateIn.value || 5,
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