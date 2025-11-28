const API_URL = '/api'; 

// Estado Global
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;
let iti = null;
let map;

// Importar librería PDF de manera segura si existe
const { jsPDF } = window.jspdf || {};

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();

    // A. Configuración de Teléfono (Solo en registro)
    const phoneInput = document.querySelector("#reg-phone");
    if (phoneInput && window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            preferredCountries: ["co", "us", "mx", "es"],
            separateDialCode: true
        });
    }

    // B. Detectar en qué página estamos
    if (document.getElementById('products-container')) {
        initStore();
        if(document.getElementById('map')) initMap();
    }

    if (document.getElementById('login-form')) initLogin();
    if (document.getElementById('register-form')) initRegister();
    if (document.getElementById('admin-products-list')) loadAdminProducts();

    // C. Listeners de Filtros (Categorías)
    const filters = document.querySelectorAll('#category-filters button');
    filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filters.forEach(b => b.classList.remove('active')); // Quitar activo a otros
            e.target.classList.add('active'); // Activar este
            renderProducts(e.target.dataset.filter); // Filtrar
        });
    });

    // D. Listener de Reseñas (Formulario dentro del Modal)
    const reviewForm = document.getElementById('reviewForm');
    if(reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
});

// ==========================================
// 2. AUTENTICACIÓN (Login / Registro / Logout)
// ==========================================

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const authSection = document.getElementById('auth-section');

    // Manejo de UI en Navbar
    if (authSection) {
        if (token && user) {
            authSection.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-outline-light btn-sm dropdown-toggle text-uppercase fw-bold" type="button" data-bs-toggle="dropdown">
                        <i class="fa-solid fa-user-astronaut"></i> ${user.name.split(' ')[0]}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow">
                        ${user.role === 'admin' ? '<li><a class="dropdown-item text-warning" href="admin.html"><i class="fa fa-crown"></i> Panel Admin</a></li>' : ''}
                        <li><a class="dropdown-item" href="#" onclick="logout()">Cerrar Sesión</a></li>
                    </ul>
                </div>
            `;
            // Mostrar formulario de reseñas si existe
            const reviewContainer = document.getElementById('review-form-container');
            const warning = document.getElementById('login-warning');
            if(reviewContainer) reviewContainer.classList.remove('d-none');
            if(warning) warning.classList.add('d-none');
        } else {
            authSection.innerHTML = '<a href="login.html" class="btn btn-outline-light btn-sm px-4 rounded-0">LOGIN</a>';
            // Ocultar formulario reseñas
            const reviewContainer = document.getElementById('review-form-container');
            const warning = document.getElementById('login-warning');
            if(reviewContainer) reviewContainer.classList.add('d-none');
            if(warning) warning.classList.remove('d-none');
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
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
                msg.innerHTML = `<span class="text-danger">${result.message}</span>`;
            }
        } catch (error) {
            msg.innerHTML = '<span class="text-danger">Error de servidor.</span>';
        }
    });
}

function initRegister() {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('msg');
        
        // Validación básica de campos vacíos
        if(!document.getElementById('reg-name').value || !document.getElementById('reg-email').value) {
            msg.innerHTML = '<span class="text-danger">Completa todos los campos.</span>';
            return;
        }

        msg.innerHTML = '<span class="text-white"><i class="fa fa-spinner fa-spin"></i> Creando cuenta...</span>';

        const data = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-pass').value,
            phone: iti ? iti.getNumber() : document.getElementById('reg-phone').value
        };

        try {
            // REGISTRO DIRECTO (Sin verificación de código)
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                // Auto-login al registrarse
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                msg.innerHTML = '<span class="text-success">¡Bienvenido! Entrando...</span>';
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                msg.innerHTML = `<span class="text-danger">${result.message}</span>`;
            }
        } catch (error) {
            msg.innerHTML = '<span class="text-danger">Error de conexión.</span>';
        }
    });
}

// ==========================================
// 3. TIENDA (Productos, Modal y Reseñas)
// ==========================================

async function initStore() {
    const loader = document.getElementById('loader');
    const container = document.getElementById('products-container');

    try {
        const res = await fetch(`${API_URL}/store/products`); // Endpoint público
        allProducts = await res.json();

        loader.classList.add('d-none');
        container.classList.remove('d-none');
        
        renderProducts('all'); // Mostrar todos al principio

        // Listener Buscador
        document.getElementById('search-input').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
            renderProducts(null, filtered);
        });

    } catch (error) {
        loader.innerHTML = '<div class="text-danger">Error cargando el garaje. Intenta recargar.</div>';
    }
}

function renderProducts(categoryFilter, customList = null) {
    const container = document.getElementById('products-container');
    let productsToShow = customList || allProducts;

    // Filtrar por categoría si no es 'all' y no es una búsqueda custom
    if (!customList && categoryFilter && categoryFilter !== 'all') {
        productsToShow = allProducts.filter(p => p.category === categoryFilter);
    }

    if (productsToShow.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h3>No hay items aquí.</h3></div>';
        return;
    }

    container.innerHTML = productsToShow.map(p => {
        const isOut = p.stock <= 0;
        const btnState = isOut ? 'disabled' : '';
        const btnText = isOut ? 'AGOTADO' : '<i class="fa fa-cart-plus"></i>';
        
        // Formato moneda USD
        const priceUSD = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        return `
        <div class="col-md-6 col-lg-4">
            <div class="card bg-dark text-white border-secondary h-100 shadow-sm hover-scale product-card">
                <div class="position-relative overflow-hidden" style="height: 250px;">
                    <img src="${p.image_url}" class="card-img-top w-100 h-100 object-fit-cover" alt="${p.name}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                    <div class="badge bg-danger position-absolute top-0 end-0 m-3 shadow">${p.category || 'General'}</div>
                    ${isOut ? '<div class="badge bg-secondary position-absolute top-0 start-0 m-3 shadow">AGOTADO</div>' : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold text-uppercase text-truncate">${p.name}</h5>
                    <p class="card-text text-muted small text-truncate">${p.description || 'Sin descripción'}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                        <span class="fs-5 fw-bold text-danger">${priceUSD}</span>
                        <div>
                            <button onclick="openProductModal(${p.id})" class="btn btn-outline-light btn-sm me-1" title="Ver Detalles"><i class="fa fa-eye"></i></button>
                            <button onclick="addToCart(${p.id})" class="btn btn-danger btn-sm" ${btnState}>${btnText}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 4. DETALLES DE PRODUCTO & RESEÑAS
// ==========================================

async function openProductModal(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;

    currentProductModalId = id; // Guardamos ID globalmente para la reseña

    // 1. Llenar datos básicos del Modal
    document.getElementById('modal-p-name').textContent = p.name;
    document.getElementById('modal-p-desc').textContent = p.description;
    document.getElementById('modal-p-price').textContent = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('modal-p-img').src = p.image_url;
    document.getElementById('modal-p-stock').textContent = `Disponibles: ${p.stock}`;
    document.getElementById('modal-p-id').value = p.id;

    // 2. Cargar Reseñas Reales desde Backend
    loadReviews(id);

    // 3. Abrir Modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function loadReviews(productId) {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '<p class="text-muted small">Cargando comentarios...</p>';

    try {
        const res = await fetch(`${API_URL}/products/${productId}/reviews`);
        const reviews = await res.json();

        if (reviews.length === 0) {
            container.innerHTML = '<p class="text-muted small fst-italic">Aún no hay reseñas. ¡Sé el primero!</p>';
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

    } catch (error) {
        container.innerHTML = '<p class="text-danger small">Error cargando reseñas.</p>';
    }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert("Debes iniciar sesión.");

    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = 'Enviando...';

    const data = {
        productId: currentProductModalId,
        rating: document.getElementById('review-rating').value,
        comment: document.getElementById('review-comment').value
    };

    try {
        const res = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            // Recargar reseñas y limpiar form
            loadReviews(currentProductModalId);
            document.getElementById('review-comment').value = '';
        } else {
            alert("Error al publicar reseña");
        }
    } catch (error) {
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Publicar Reseña';
    }
}

// Función auxiliar para añadir desde el modal
window.addToCartFromModal = function() {
    if(currentProductModalId) {
        addToCart(currentProductModalId);
        // Opcional: Cerrar modal
        // bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        alert("Agregado al garaje");
    }
}

// ==========================================
// 5. CARRITO Y PAGO (USD)
// ==========================================

window.addToCart = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    const item = cart.find(x => x.id === id);
    if(item) {
        if(item.quantity >= p.stock) return alert("¡No hay más stock disponible!");
        item.quantity++;
    } else {
        if(p.stock <= 0) return alert("Producto Agotado");
        cart.push({...p, quantity: 1});
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

window.openPaymentModal = function() {
    if(cart.length === 0) return alert("Tu garaje está vacío.");
    
    // Abrir Modal de Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

window.checkout = async function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if(!token) return alert("Por favor inicia sesión para comprar.");

    const btn = document.querySelector('#paymentModal .btn-success');
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando Pago...';
    btn.disabled = true;

    // Calcular total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
        cart: cart,
        email: user.email,
        total: total,
        paymentMethod: 'Credit Card' // Simulado
    };

    try {
        const res = await fetch(`${API_URL}/store/order`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const result = await res.json();

        if (res.ok) {
            generateInvoicePDF(user, orderData, result.orderId);
            cart = [];
            localStorage.removeItem('cart');
            updateCartUI();
            
            // Cerrar modal
            const modalEl = document.getElementById('paymentModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            alert("¡Compra Exitosa! Factura descargada.");
            initStore(); // Recargar stock visualmente
        } else {
            alert("Error en la compra: " + result.message);
        }
    } catch (error) {
        alert("Error de conexión");
    } finally {
        btn.innerHTML = 'PROCEDER AL PAGO';
        btn.disabled = false;
    }
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    // Guardar
    localStorage.setItem('cart', JSON.stringify(cart));

    if(count) {
        const qty = cart.reduce((a,b)=>a+b.quantity,0);
        count.innerText = qty;
        count.style.display = qty > 0 ? 'block' : 'none';
    }

    if(list && totalEl) {
        let total = 0;
        list.innerHTML = cart.length ? cart.map((i, index) => {
            total += i.price * i.quantity;
            return `
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom border-secondary pb-2">
                <div>
                    <strong class="text-white">${i.name}</strong>
                    <div class="text-muted small">${i.quantity} x $${i.price}</div>
                </div>
                <div class="d-flex align-items-center">
                    <span class="text-success me-3 fw-bold">$${(i.price * i.quantity).toFixed(2)}</span>
                    <button onclick="removeItem(${index})" class="btn btn-sm text-danger"><i class="fa fa-trash"></i></button>
                </div>
            </div>`;
        }).join('') : '<div class="text-center text-muted py-3">Tu colección está vacía.</div>';
        
        totalEl.innerText = `$${total.toFixed(2)} USD`;
    }
}

window.removeItem = function(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// Generador PDF (Adaptado a USD)
function generateInvoicePDF(user, order, orderId) {
    if(!window.jspdf) return;
    const doc = new window.jspdf.jsPDF();
    
    doc.setFillColor(20, 20, 20); // Fondo oscuro header
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("SPEEDCOLLECT", 105, 20, null, null, "center");
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Cliente: ${user.name}`, 14, 50);
    doc.text(`Email: ${user.email}`, 14, 56);
    doc.text(`Orden ID: #${orderId}`, 14, 62);
    
    const rows = order.cart.map(i => [
        i.name, i.quantity, `$${i.price}`, `$${(i.price * i.quantity).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 70,
        head: [['Item', 'Cant', 'Unit (USD)', 'Total']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] } // Rojo Ferrari
    });

    doc.setFontSize(14);
    doc.text(`TOTAL PAGADO: $${order.total.toFixed(2)} USD`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`Invoice_SpeedCollect_${orderId}.pdf`);
}

// ==========================================
// 6. CHATBOT (ENZO AI)
// ==========================================
window.toggleChat = function() {
    const w = document.getElementById('chat-window');
    w.classList.toggle('d-none');
}

window.sendChat = async function() {
    const input = document.getElementById('chat-input');
    const body = document.getElementById('chat-body');
    const msg = input.value.trim();
    if(!msg) return;

    // Mensaje Usuario
    body.innerHTML += `<div class="text-end mb-2"><span class="bg-primary text-white p-2 rounded d-inline-block">${msg}</span></div>`;
    input.value = '';
    
    // Indicador "Escribiendo..."
    const loadingId = 'typing-' + Date.now();
    body.innerHTML += `<div class="text-start mb-2" id="${loadingId}"><span class="bg-secondary text-white p-2 rounded d-inline-block fst-italic">Enzo está escribiendo...</span></div>`;
    body.scrollTop = body.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        
        // Quitar loading y poner respuesta
        document.getElementById(loadingId).remove();
        body.innerHTML += `<div class="text-start mb-2"><span class="bg-dark border border-secondary text-light p-2 rounded d-inline-block">${data.reply}</span></div>`;
        
    } catch (e) {
        document.getElementById(loadingId).remove();
        body.innerHTML += `<div class="text-start mb-2"><span class="text-danger">Enzo no está disponible.</span></div>`;
    }
    body.scrollTop = body.scrollHeight;
}

// ==========================================
// 7. MAPA (Leaflet)
// ==========================================
function initMap() {
    map = L.map('map').setView([4.666, -74.053], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
    }).addTo(map);

    const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color:#dc3545;width:15px;height:15px;border-radius:50%;box-shadow:0 0 10px #dc3545;border:2px solid white;"></div>`
    });

    L.marker([4.666, -74.053], {icon: customIcon}).addTo(map)
        .bindPopup("<b>SpeedCollect HQ</b><br>Zona Rosa, Bogotá").openPopup();
}

// ==========================================
// 8. ADMIN (Carga simple)
// ==========================================
async function loadAdminProducts() {
    const list = document.getElementById('admin-products-list');
    try {
        const res = await fetch(`${API_URL}/store/products`);
        const products = await res.json();
        list.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.image_url}" width="40" height="40" class="rounded object-fit-cover"> ${p.name}</td>
                <td><span class="badge bg-secondary">${p.category}</span></td>
                <td>$${p.price}</td>
                <td>${p.stock}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${p.id})"><i class="fa fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})"><i class="fa fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}