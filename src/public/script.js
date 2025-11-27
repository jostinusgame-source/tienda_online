const API_URL = '/api'; 
let cart = [];
let allProducts = []; 
let iti = null;
let map;

// Importar librería PDF si está disponible
const { jsPDF } = window.jspdf || {};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuración de Teléfono Internacional
    const phoneInput = document.querySelector("#reg-phone");
    if (phoneInput && window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: c => fetch("https://ipapi.co/json").then(r => r.json()).then(d => c(d.country_code)).catch(() => c("co")),
            preferredCountries: ["co", "fr", "us", "es", "mx"],
            separateDialCode: true,
            nationalMode: true
        });
        phoneInput.addEventListener('input', validatePhone);
        phoneInput.addEventListener('countrychange', validatePhone);
    }

    // 2. Listeners de Formularios
    if(document.getElementById('register-form')) {
        document.getElementById('reg-name').addEventListener('input', validateName);
        document.getElementById('reg-email').addEventListener('input', validateEmail);
        document.getElementById('reg-pass').addEventListener('input', validatePassword);
        document.getElementById('register-form').addEventListener('submit', handleRegister);
    }

    // 3. Cargas Iniciales
    checkSession();
    updateCartUI(); 
    if(document.getElementById('products-container')) loadProducts();
    if(document.getElementById('map')) initMap();
    if(document.getElementById('login-form')) setupLogin();
});

// ==========================================
// 1. ADMIN PANEL & AUTH
// ==========================================
function checkSession() {
    const userStr = localStorage.getItem('user');
    const authDiv = document.getElementById('auth-section');
    
    if(userStr && authDiv) {
        const u = JSON.parse(userStr);
        let adminBtn = '';
        
        // Si es ADMIN, mostramos botón especial
        if(u.role === 'admin') {
            adminBtn = `<button onclick="loadAdminPanel()" class="btn btn-sm btn-warning fw-bold me-2"><i class="fa fa-crown"></i> ADMIN</button>`;
        }

        authDiv.innerHTML = `
            <div class="d-flex align-items-center">
                ${adminBtn}
                <div class="dropdown">
                    <button class="btn btn-outline-light btn-sm dropdown-toggle text-uppercase fw-bold" type="button" data-bs-toggle="dropdown">
                        <i class="fa fa-user-astronaut me-1"></i> ${u.name.split(' ')[0]}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg border border-secondary">
                        <li><span class="dropdown-item-text small text-muted">${u.email}</span></li>
                        <li><hr class="dropdown-divider bg-secondary"></li>
                        <li><button onclick="logout()" class="dropdown-item text-danger"><i class="fa fa-power-off me-2"></i> Salir</button></li>
                    </ul>
                </div>
            </div>`;
    }
}

// Cargar Panel de Admin
async function loadAdminPanel() {
    const token = localStorage.getItem('token');
    if(!token) return alert("Acceso denegado");

    try {
        const res = await fetch(`${API_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(!res.ok) throw new Error("No tienes permisos de administrador");
        
        const users = await res.json();
        
        // Crear filas de la tabla
        let rows = users.map(u => `
            <tr id="user-row-${u.id}">
                <td>${u.id}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.role === 'admin' ? '<span class="badge bg-warning text-dark">ADMIN</span>' : '<span class="badge bg-secondary">CLIENTE</span>'}</td>
                <td>
                    ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="fa fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');

        const modalHtml = `
        <div class="modal fade" id="adminModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content bg-dark text-white border-warning">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-warning fw-bold"><i class="fa fa-cogs"></i> GESTIÓN DE USUARIOS</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <h6 class="mb-3 text-muted">Usuarios Registrados: <span class="text-white">${users.length}</span></h6>
                        <div class="table-responsive">
                            <table class="table table-dark table-hover border-secondary align-middle">
                                <thead>
                                    <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr>
                                </thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // Limpiar y mostrar
        const oldModal = document.getElementById('adminModal');
        if(oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('adminModal')).show();

    } catch(e) {
        alert("Error: " + e.message);
    }
}

// Eliminar Usuario (Funcionalidad Admin)
async function deleteUser(id) {
    if(!confirm("¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.")) return;
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/auth/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(res.ok) {
            document.getElementById(`user-row-${id}`).remove();
            alert("Usuario eliminado correctamente.");
        } else {
            alert("Error al eliminar usuario.");
        }
    } catch(e) {
        console.error(e);
        alert("Error de conexión.");
    }
}

// ==========================================
// 2. REGISTRO & VERIFICACIÓN (CRÍTICO: EMAIL)
// ==========================================
async function handleRegister(e) {
    e.preventDefault();
    if (!validateName() || !validateEmail() || !validatePassword() || !validatePhone()) return alert("Corrige los errores antes de enviar.");

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enviando código...';
    btn.disabled = true;

    const data = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-pass').value,
        phone: iti.getNumber()
    };

    try {
        console.log("📤 Iniciando registro para:", data.email);
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        });
        
        const json = await res.json();
        
        if (res.ok) {
            console.log("✅ Código enviado.");
            localStorage.setItem('pendingEmail', data.email);
            let code = prompt(`✅ Código enviado a ${data.email}.\n(Revisa Spam si no llega).\n\nIngresa el código aquí:`);
            
            if(code) {
                await verifyCode(data.email, code);
            } else {
                alert("Debes ingresar el código para activar la cuenta.");
            }
        } else {
            console.error("❌ Error Backend:", json);
            alert("❌ NO SE PUDO ENVIAR EL CÓDIGO:\n" + json.message);
        }
    } catch (err) { 
        console.error("❌ Error Red:", err);
        alert("Error de conexión con el servidor. Revisa tu internet."); 
    } finally { 
        btn.innerHTML = originalText; 
        btn.disabled = false; 
    }
}

async function verifyCode(email, code) {
    try {
        const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, code })
        });
        const json = await res.json();
        
        if(res.ok) {
            alert("🎉 ¡CUENTA VERIFICADA! Bienvenido a la familia.");
            window.location.href = 'login.html';
        } else {
            alert("❌ Código incorrecto o expirado.");
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
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if(res.ok) {
                localStorage.setItem('user', JSON.stringify(json.user));
                localStorage.setItem('token', json.token);
                window.location.href = 'index.html';
            } else alert(json.message);
        } catch(err) { alert("Error conexión"); }
    });
}

window.logout = function() { 
    localStorage.clear(); 
    window.location.href = 'index.html'; 
}

// ==========================================
// 3. CATÁLOGO DE LUJO & RESEÑAS
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
    
    if(!products || products.length === 0) { 
        cont.innerHTML = '<div class="col-12 text-center text-muted">Inventario agotado por el momento.</div>'; 
        return; 
    }

    cont.innerHTML = products.map(p => {
        const inCart = cart.find(c => c.id === p.id)?.quantity || 0;
        const realStock = p.stock - inCart;
        const isOut = realStock <= 0;
        const price = parseFloat(p.price).toLocaleString('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0});
        
        const imgUrl = p.image_url || 'https://images.unsplash.com/photo-1594058573823-d8edf10d5d6d?auto=format&fit=crop&w=500';

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="product-card h-100 bg-dark text-white border border-secondary position-relative shadow-lg overflow-hidden">
                <span class="badge ${isOut ? 'bg-secondary' : 'bg-danger'} position-absolute m-3 shadow" style="z-index:10">${isOut ? 'AGOTADO' : 'DISPONIBLE'}</span>
                
                <div class="card-img-wrap" style="height:250px; cursor:pointer;" onclick="showProductDetails(${p.id})">
                    <img src="${imgUrl}" class="w-100 h-100 object-fit-cover" onerror="this.src='https://via.placeholder.com/500x300?text=Auto+Sin+Imagen'">
                    <div class="overlay-3d position-absolute top-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background:rgba(0,0,0,0.6); opacity:0; transition:0.3s">
                        <div class="text-center">
                            <i class="fa-solid fa-eye fa-2x text-white mb-2"></i>
                            <p class="text-uppercase fw-bold text-white small ls-2">Ver Detalles y Reseñas</p>
                        </div>
                    </div>
                </div>
                
                <div class="p-3">
                    <h5 class="fw-bold text-uppercase text-truncate">${p.name}</h5>
                    <p class="text-danger fw-bold fs-5">${price}</p>
                    <button class="btn btn-outline-light w-100 text-uppercase" onclick="addToCart(${p.id})" ${isOut ? 'disabled' : ''}>
                        <i class="fa fa-cart-plus me-2"></i> ${isOut ? 'Sin Stock' : 'Añadir'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    document.querySelectorAll('.card-img-wrap').forEach(el => {
        el.addEventListener('mouseenter', () => el.querySelector('.overlay-3d').style.opacity = '1');
        el.addEventListener('mouseleave', () => el.querySelector('.overlay-3d').style.opacity = '0');
    });
}

// MODAL DE DETALLES (CON VISOR 3D Y RESEÑAS)
window.showProductDetails = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;

    const reviewers = ["Carlos M.", "Ana R.", "David S.", "Valentina T."];
    const comments = ["¡Increíble nivel de detalle!", "La pintura es perfecta.", "Una joya para mi colección.", "El motor se ve súper realista."];
    
    let reviewsHtml = '';
    const numReviews = Math.floor(Math.random() * 3) + 1;
    
    for(let i=0; i<numReviews; i++) {
        reviewsHtml += `
            <div class="bg-black p-3 rounded mb-2 border border-secondary">
                <div class="d-flex justify-content-between">
                    <strong class="text-danger">${reviewers[i]}</strong>
                    <span class="text-warning">★★★★★</span>
                </div>
                <p class="small text-muted mb-0 mt-1">"${comments[i]}"</p>
            </div>`;
    }

    const modalHtml = `
    <div class="modal fade" id="detailModal" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content bg-dark text-white border-secondary">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title text-uppercase fw-bold"><i class="fa-solid fa-car me-2 text-danger"></i>${p.name}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-lg-7 mb-3">
                            <div class="ratio ratio-16x9 bg-black rounded overflow-hidden border border-secondary">
                                ${p.model_url ? 
                                `<model-viewer src="${p.model_url}" alt="${p.name}" auto-rotate camera-controls style="width:100%; height:100%;"></model-viewer>` :
                                `<img src="${p.image_url}" class="object-fit-cover w-100 h-100">`
                                }
                            </div>
                        </div>
                        <div class="col-lg-5">
                            <h3 class="text-danger fw-bold mb-3">${parseFloat(p.price).toLocaleString('es-CO', {style:'currency', currency:'COP'})}</h3>
                            <p class="text-light">${p.description}</p>
                            <hr class="border-secondary">
                            <h6 class="text-uppercase fw-bold mb-3"><i class="fa-solid fa-comments me-2"></i>Reseñas</h6>
                            <div class="reviews-container" style="max-height: 200px; overflow-y: auto;">${reviewsHtml}</div>
                            <button class="btn btn-success w-100 mt-3 py-2 fw-bold" onclick="addToCart(${p.id}); bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();">
                                AGREGAR AL CARRITO
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const existingModal = document.getElementById('detailModal');
    if(existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

// ==========================================
// 4. PAGOS Y FACTURA PDF
// ==========================================
window.openPaymentModal = function() {
    if(cart.length === 0) return alert("Tu garaje está vacío.");
    
    let modalEl = document.getElementById('paymentModal');
    if(!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="paymentModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-dark text-white border border-secondary">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title fw-bold">PASARELA DE PAGO</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Resumen de Compra:</p>
                        <ul id="payment-summary" class="list-group list-group-flush mb-3"></ul>
                        <div class="d-flex justify-content-between fw-bold fs-4 border-top border-secondary pt-2">
                            <span>TOTAL:</span>
                            <span id="payment-total" class="text-success"></span>
                        </div>
                        <hr>
                        <div class="mb-3">
                            <label class="form-label text-muted small">Método de Pago</label>
                            <select class="form-select bg-black text-white border-secondary">
                                <option>Tarjeta de Crédito</option>
                                <option>PSE</option>
                                <option>Nequi</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-success fw-bold w-100" id="btn-pay-now">PAGAR AHORA</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('paymentModal');
    }

    // Llenar datos
    const summaryList = document.getElementById('payment-summary');
    const totalSpan = document.getElementById('payment-total');
    let total = 0;
    
    summaryList.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `<li class="list-group-item bg-dark text-white border-secondary d-flex justify-content-between">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toLocaleString('es-CO')}</span>
        </li>`;
    }).join('');
    totalSpan.textContent = total.toLocaleString('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0});

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Evento Pagar
    const payBtn = document.getElementById('btn-pay-now');
    payBtn.onclick = async function() {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando...';
        await new Promise(r => setTimeout(r, 2000)); // Simular banco
        
        generateInvoicePDF();
        
        alert("¡PAGO APROBADO! Tu factura se está descargando.");
        cart = [];
        updateCartUI();
        renderProducts(allProducts);
        modal.hide();
        payBtn.disabled = false;
        payBtn.innerHTML = 'PAGAR AHORA';
    };
}

function generateInvoicePDF() {
    if(!window.jspdf) return alert("Librería PDF no cargada.");

    const doc = new window.jspdf.jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Header Factura
    doc.setFillColor(217, 4, 41);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("SPEEDCOLLECT", 105, 20, null, null, "center");
    doc.setFontSize(12);
    doc.text("Factura de Venta", 105, 30, null, null, "center");

    // Datos
    const user = JSON.parse(localStorage.getItem('user')) || {name: "Cliente", email: "N/A"};
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${user.name}`, 14, 50);
    doc.text(`Fecha: ${date}`, 14, 56);
    doc.text(`Ref: #SC-${Date.now()}`, 14, 62);

    // Tabla
    const tableData = cart.map(item => [
        item.name, item.quantity, `$${parseFloat(item.price).toLocaleString('es-CO')}`, `$${(item.price * item.quantity).toLocaleString('es-CO')}`
    ]);
    let grandTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    doc.autoTable({
        startY: 70,
        head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [217, 4, 41] }
    });

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${grandTotal.toLocaleString('es-CO')}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`Factura_SpeedCollect.pdf`);
}

// ==========================================
// 5. CARRITO
// ==========================================
window.addToCart = function(id) {
    const p = allProducts.find(x => x.id === id);
    const item = cart.find(x => x.id === id);
    if(item) {
        if(item.quantity >= p.stock) return alert("¡Stock insuficiente!");
        item.quantity++;
    } else {
        cart.push({...p, quantity: 1});
    }
    updateCartUI();
    renderProducts(allProducts);
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
        list.innerHTML = cart.length ? cart.map(i => {
            total += i.price * i.quantity;
            return `<div class="d-flex justify-content-between mb-2 border-bottom border-secondary pb-2">
                <div><small>${i.name}</small> <small class="text-muted">(${i.quantity})</small></div>
                <div class="d-flex align-items-center">
                    <span class="text-success me-2">$${(i.price * i.quantity).toLocaleString('es-CO')}</span>
                    <button onclick="removeFromCart(${i.id})" class="btn btn-sm text-danger p-0"><i class="fa fa-times"></i></button>
                </div>
            </div>`;
        }).join('') : '<div class="text-center text-muted">Vacío</div>';
        totalEl.innerText = total.toLocaleString('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0});
    }
}

// ==========================================
// 6. MAPA DE LUJO
// ==========================================
function initMap() {
    const lat = 4.666, lng = -74.053;
    map = L.map('map').setView([lat, lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB', subdomains: 'abcd', maxZoom: 20
    }).addTo(map);

    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#ff2800; width:15px; height:15px; border-radius:50%; box-shadow:0 0 15px #ff2800; border: 2px solid white;'></div>",
        iconSize: [15, 15], iconAnchor: [7, 7]
    });

    L.marker([lat, lng], { icon: icon }).addTo(map)
        .bindPopup(`<div style="text-align:center; color:black;"><b style="color:#d90429">SPEEDCOLLECT HQ</b><br>Bogotá, Colombia</div>`).openPopup();
}

// ==========================================
// 7. VALIDACIONES ESTRICTAS
// ==========================================
function validatePhone() {
    const input = document.querySelector("#reg-phone");
    const err = document.getElementById('err-phone');
    if (!iti) return false;
    
    if (iti.isValidNumber()) return showSuccess(input, err);
    
    const errorCode = iti.getValidationError();
    let msg = "Número inválido.";
    if(errorCode === 1) msg = "País inválido.";
    if(errorCode === 2) msg = "Muy corto.";
    if(errorCode === 3) msg = "Muy largo.";
    return showError(input, err, msg);
}

function validateName() {
    const input = document.getElementById('reg-name');
    const err = document.getElementById('err-name');
    const val = input.value.trim();
    const words = val.split(/\s+/);
    
    if (words.length < 1 || val === "") return showError(input, err, "Nombre requerido.");
    if (words.length > 3) return showError(input, err, "Máximo 3 palabras.");
    if (new Set(words.map(w => w.toLowerCase())).size !== words.length) return showError(input, err, "No repitas nombres.");
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(val)) return showError(input, err, "Solo letras.");
    
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
    if (!/^[a-zA-Z0-9._-]{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(val)) return showError(input, err, "Correo inválido.");
    if (val.includes('yopmail') || val.includes('tempmail')) return showError(input, err, "No correos temporales.");
    return showSuccess(input, err);
}

function validatePassword() {
    const input = document.getElementById('reg-pass');
    const err = document.getElementById('err-pass');
    const val = input.value;
    if (val.length < 10) return showError(input, err, "Mínimo 10 caracteres.");
    if (!/[A-Z]/.test(val) || !/[a-z]/.test(val) || !/[0-9]/.test(val) || !/[!@#$%^&*]/.test(val)) return showError(input, err, "Falta Mayúscula, Minúscula, Número o Símbolo.");
    if (/(.)\1\1/.test(val)) return showError(input, err, "No repitas caracteres (aaa).");
    return showSuccess(input, err);
}

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