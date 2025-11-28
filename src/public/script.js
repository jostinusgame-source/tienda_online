const API_URL = '/api'; 
let cart = [];
let allProducts = []; 
let iti = null;

// Importar librería PDF de manera segura
const { jsPDF } = window.jspdf || {};

document.addEventListener('DOMContentLoaded', () => {
    // Configuración Teléfono
    const phoneInput = document.querySelector("#reg-phone");
    if (phoneInput && window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "auto",
            geoIpLookup: c => fetch("https://ipapi.co/json").then(r => r.json()).then(d => c(d.country_code)).catch(() => c("co")),
            preferredCountries: ["co", "mx", "us", "es"],
            separateDialCode: true
        });
    }

    // Eventos
    if(document.getElementById('register-form')) setupAuthListeners();
    
    checkSession();
    updateCartUI(); 
    if(document.getElementById('products-container')) loadProducts();
});

// ==========================================
// TIENDA: PRODUCTOS, STOCK Y RESEÑAS
// ==========================================
async function loadProducts() {
    const cont = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) throw new Error('Error API');
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
        // Calcular Stock en Tiempo Real (BD - Carrito Local)
        const inCart = cart.find(c => c.id === p.id)?.quantity || 0;
        const realStock = p.stock - inCart;
        const isOut = realStock <= 0;
        
        // Imagen Fallback Robusto
        const img = p.image_url || 'https://placehold.co/600x400/1a1a1a/FFF?text=Sin+Imagen';
        const price = parseFloat(p.price).toLocaleString('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0});

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="product-card h-100 bg-dark text-white border border-secondary shadow position-relative">
                <span class="badge ${isOut ? 'bg-secondary' : 'bg-success'} position-absolute top-0 end-0 m-3 shadow">
                    ${isOut ? 'AGOTADO' : `Stock: ${realStock}`}
                </span>
                
                <div class="card-img-wrap" style="height:250px; cursor:pointer;" onclick="showProductDetails(${p.id})">
                    <img src="${img}" class="w-100 h-100 object-fit-cover" 
                         onerror="this.src='https://placehold.co/600x400/333/FFF?text=Error+Carga';">
                    <div class="overlay-3d position-absolute top-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                         style="background:rgba(0,0,0,0.5); opacity:0; transition:0.3s">
                        <p class="text-white fw-bold"><i class="fa fa-eye"></i> VER DETALLES</p>
                    </div>
                </div>
                
                <div class="p-3">
                    <h5 class="fw-bold text-truncate">${p.name}</h5>
                    <p class="text-danger fw-bold fs-5">${price}</p>
                    <button class="btn btn-outline-light w-100" onclick="addToCart(${p.id})" ${isOut ? 'disabled' : ''}>
                        ${isOut ? 'Sin Stock' : 'Añadir al Carrito'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Hover Effects
    document.querySelectorAll('.card-img-wrap').forEach(el => {
        el.addEventListener('mouseenter', () => el.querySelector('.overlay-3d').style.opacity = '1');
        el.addEventListener('mouseleave', () => el.querySelector('.overlay-3d').style.opacity = '0');
    });
}

// MODAL DETALLES + RESEÑAS
window.showProductDetails = function(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;

    // Renderizar Reseñas Existentes
    const reviewsHtml = (p.reviews || []).map(r => `
        <div class="bg-black p-2 rounded mb-2 border border-secondary small">
            <div class="d-flex justify-content-between">
                <strong class="text-danger">${r.user_name}</strong>
                <span class="text-warning">${'★'.repeat(r.rating)}</span>
            </div>
            <p class="mb-0 text-muted">${r.comment}</p>
        </div>
    `).join('') || '<p class="text-muted small">Sé el primero en opinar.</p>';

    const modalHtml = `
    <div class="modal fade" id="detailModal" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content bg-dark text-white border-secondary">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title fw-bold">${p.name}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-lg-7">
                            <img src="${p.image_url}" class="img-fluid rounded border border-secondary w-100" onerror="this.src='https://placehold.co/600x400'">
                            <p class="mt-3">${p.description}</p>
                        </div>
                        <div class="col-lg-5">
                            <h4 class="text-danger fw-bold">${parseFloat(p.price).toLocaleString('es-CO', {style:'currency', currency:'COP'})}</h4>
                            <hr class="border-secondary">
                            
                            <h6>Reseñas</h6>
                            <div class="reviews-box mb-3" style="max-height:200px; overflow-y:auto;">${reviewsHtml}</div>
                            
                            <!-- Formulario Reseña -->
                            <div class="bg-dark-glass p-2 border border-secondary rounded">
                                <input type="text" id="review-name" class="form-control form-control-sm bg-black text-white border-secondary mb-1" placeholder="Tu Nombre">
                                <select id="review-rating" class="form-select form-select-sm bg-black text-white border-secondary mb-1">
                                    <option value="5">★★★★★ Excelente</option>
                                    <option value="4">★★★★ Bueno</option>
                                    <option value="3">★★★ Regular</option>
                                </select>
                                <textarea id="review-text" class="form-control form-control-sm bg-black text-white border-secondary mb-1" placeholder="Tu opinión..."></textarea>
                                <button onclick="submitReview(${p.id})" class="btn btn-sm btn-danger w-100">Publicar Reseña</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const old = document.getElementById('detailModal');
    if(old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

window.submitReview = async function(productId) {
    const name = document.getElementById('review-name').value;
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-text').value;
    
    if(!name || !comment) return alert("Completa los campos.");
    
    try {
        await fetch(`${API_URL}/reviews`, {
            method: 'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ productId, userName: name, rating, comment })
        });
        alert("Reseña publicada.");
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
        loadProducts(); // Recargar para ver la nueva reseña
    } catch(e) { alert("Error al publicar."); }
}

// ==========================================
// PAGOS REALES (BAJA DE STOCK)
// ==========================================
window.openPaymentModal = function() {
    if(cart.length === 0) return alert("Carrito vacío");
    
    // Crear Modal Pago si no existe
    let modalEl = document.getElementById('paymentModal');
    if(!modalEl) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="paymentModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-dark text-white border-secondary">
                    <div class="modal-header"><h5 class="modal-title">Finalizar Compra</h5></div>
                    <div class="modal-body text-center">
                        <p>Total a pagar:</p>
                        <h2 class="text-success" id="pay-total"></h2>
                        <button id="btn-pay-real" class="btn btn-success fw-bold w-100 mt-3">CONFIRMAR PAGO</button>
                    </div>
                </div>
            </div>
        </div>`);
        modalEl = document.getElementById('paymentModal');
    }
    
    // Calcular total
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    document.getElementById('pay-total').innerText = total.toLocaleString('es-CO', {style:'currency', currency:'COP'});
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    document.getElementById('btn-pay-real').onclick = async function() {
        const btn = this;
        btn.disabled = true;
        btn.innerHTML = 'Procesando...';
        
        try {
            const user = JSON.parse(localStorage.getItem('user')) || {email: 'invitado@tienda.com'};
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ cart, email: user.email, total })
            });
            const data = await res.json();
            
            if(data.success) {
                generateInvoicePDF(); // Generar Factura
                alert("¡Compra Exitosa! Stock actualizado.");
                cart = [];
                updateCartUI();
                loadProducts(); // Refrescar stock visual
                modal.hide();
            } else {
                alert("Error: " + data.message);
            }
        } catch(e) {
            alert("Error de conexión");
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'CONFIRMAR PAGO';
        }
    };
}

// ==========================================
// ADMIN Y AUTH
// ==========================================
function checkSession() {
    const user = JSON.parse(localStorage.getItem('user'));
    const div = document.getElementById('auth-section');
    if(user && div) {
        let adminBtn = user.role === 'admin' ? 
            `<button onclick="loadAdminPanel()" class="btn btn-warning btn-sm me-2">ADMIN</button>` : '';
        
        div.innerHTML = `${adminBtn} <span class="text-white me-2">${user.name}</span> 
                         <button onclick="logout()" class="btn btn-outline-danger btn-sm">Salir</button>`;
    }
}

async function loadAdminPanel() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${token}` } // Necesario AuthMiddleware en backend real
        });
        const users = await res.json();
        
        // Renderizar tabla simple
        let rows = users.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td></tr>`).join('');
        
        const modalHtml = `
        <div class="modal fade" id="adminModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content bg-dark text-white">
                    <div class="modal-header"><h5 class="modal-title">Admin Panel</h5><button class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body"><table class="table table-dark"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead><tbody>${rows}</tbody></table></div>
                </div>
            </div>
        </div>`;
        
        const old = document.getElementById('adminModal'); if(old) old.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('adminModal')).show();
    } catch(e) { alert("Acceso denegado o error."); }
}

// ==========================================
// UTILIDADES (CARRITO, PDF, AUTH)
// ==========================================
window.addToCart = function(id) {
    const p = allProducts.find(x => x.id === id);
    const item = cart.find(x => x.id === id);
    const qty = item ? item.quantity : 0;
    
    if(qty >= p.stock) return alert("¡Sin stock disponible!");
    
    if(item) item.quantity++; else cart.push({...p, quantity: 1});
    updateCartUI();
    renderProducts(allProducts); // Refrescar badges
}

window.removeFromCart = function(id) {
    cart = cart.filter(x => x.id !== id);
    updateCartUI();
    renderProducts(allProducts);
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    if(count) {
        count.innerText = cart.reduce((a,b)=>a+b.quantity, 0);
        count.style.display = count.innerText == '0' ? 'none' : 'block';
    }
    // Renderizar lista en modal si está abierto (lógica simplificada aquí)
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if(list && totalEl) {
        let total = 0;
        list.innerHTML = cart.map(i => {
            total += i.price * i.quantity;
            return `<div class="d-flex justify-content-between text-white border-bottom border-secondary mb-2"><span>${i.name} (${i.quantity})</span><span>$${(i.price*i.quantity).toLocaleString()}</span></div>`;
        }).join('');
        totalEl.innerText = total.toLocaleString('es-CO', {style:'currency', currency:'COP'});
    }
}

function generateInvoicePDF() {
    if(!window.jspdf) return;
    const doc = new window.jspdf.jsPDF();
    doc.text("FACTURA DE COMPRA - SPEEDCOLLECT", 10, 10);
    let y = 20;
    cart.forEach(i => {
        doc.text(`${i.quantity} x ${i.name} - $${(i.price*i.quantity).toLocaleString()}`, 10, y);
        y += 10;
    });
    doc.save(`Factura_${Date.now()}.pdf`);
}

// Helpers Auth
function setupAuthListeners() { /* ... tu lógica de validación anterior ... */ }
function setupLogin() { /* ... tu lógica de login anterior ... */ }
window.logout = function() { localStorage.clear(); location.reload(); }
function validateName(){} function validateEmail(){} function validatePassword(){} function handleRegister(e){ e.preventDefault(); } // Mantener tus validaciones