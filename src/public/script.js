const API_URL = '/api'; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];
let currentProductModalId = null;

// ==========================================
// CONFIGURACIÓN DE PAÍSES Y REGLAS DE TELÉFONO
// ==========================================
const COUNTRY_RULES = [
    { country: "Colombia", code: "57", digits: 10, flag: "🇨🇴", pattern: /^3\d{9}$/, hint: "Debe iniciar con 3 (10 dígitos)" },
    { country: "México", code: "52", digits: 10, flag: "🇲🇽", pattern: /^\d{10}$/, hint: "10 dígitos" },
    { country: "Estados Unidos", code: "1", digits: 10, flag: "🇺🇸", pattern: /^[2-9]\d{2}[2-9]\d{6}$/, hint: "10 dígitos (NPA-NXX-XXXX)" },
    { country: "España", code: "34", digits: 9, flag: "🇪🇸", pattern: /^[67]\d{8}$/, hint: "9 dígitos, móvil inicia con 6 o 7" },
    { country: "Argentina", code: "54", digits: 10, flag: "🇦🇷", pattern: /^\d{10,11}$/, hint: "10 u 11 dígitos" },
    { country: "Chile", code: "56", digits: 9, flag: "🇨🇱", pattern: /^9\d{8}$/, hint: "9 dígitos, inicia con 9" },
    { country: "Perú", code: "51", digits: 9, flag: "🇵🇪", pattern: /^9\d{8}$/, hint: "9 dígitos, inicia con 9" },
    { country: "Ecuador", code: "593", digits: 10, flag: "🇪🇨", pattern: /^09\d{8}$/, hint: "10 dígitos, inicia con 09" }
];

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateCartUI();

    // Detección de página y carga de módulos
    if (document.getElementById('products-container')) initStore();
    if (document.getElementById('register-form')) initRegisterStrict();
    if (document.getElementById('login-form')) initLogin();
    
    // Listener Global para Reseñas
    const reviewForm = document.getElementById('reviewForm');
    if(reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);
});

// ==========================================
// 1. TIENDA INTERACTIVA (Click en todo el card)
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

        // Filtros
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
        // Fallback de imagen si viene vacía
        const img = p.image_url || 'https://via.placeholder.com/600x400?text=No+Image';
        const price = parseFloat(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const isOut = p.stock <= 0;

        // Tarjeta completa es clickeable con onclick="openModal..."
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
                        <span class="fs-4 fw-bold text-danger">${price}</span>
                        <!-- Botón carrito con stopPropagation para no abrir el modal al añadir -->
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
// 2. MODAL DE INSPECCIÓN 3D
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
    
    // VISUALIZADOR 3D SKETCHFAB
    const container = document.getElementById('visual-container');
    if(p.model_url && p.model_url.includes('sketchfab')) {
        container.innerHTML = `
            <div class="ratio ratio-16x9 border border-secondary rounded shadow-lg">
                <iframe src="${p.model_url}" title="${p.name}" frameborder="0" allow="autoplay; fullscreen; vr" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
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
// 3. RECIBO PDF PROFESIONAL (Estilo Imagen)
// ==========================================
window.checkout = function() {
    if(!window.jspdf) return alert("Error cargando librería PDF");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem('user'));
    const date = new Date().toLocaleDateString();
    
    // Configuración de Colores
    const darkBlue = "#1a237e";

    // 1. Encabezado "RECIBO"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(darkBlue);
    doc.text("RECIBO", 20, 25);

    // 2. Logo / Marca
    doc.setFillColor(200, 200, 200);
    doc.circle(170, 20, 12, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("SC", 166, 22); // SpeedCollect Initials

    // 3. Info Empresa
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("SpeedCollect Inc.", 20, 40);
    doc.setFont("helvetica", "normal");
    doc.text("Zona Rosa, Bogotá", 20, 45);
    doc.text("contact@speedcollect.com", 20, 50);

    // 4. Datos Cliente y Recibo
    doc.setFont("helvetica", "bold");
    doc.text("ENVIAR A", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(user.name, 20, 72);
    doc.text(user.email, 20, 77);

    // Columna Der (Detalles)
    const rightColX = 120;
    doc.setFont("helvetica", "bold");
    doc.text("N° DE RECIBO:", rightColX, 65);
    doc.text("FECHA:", rightColX, 72);
    
    doc.setFont("helvetica", "normal");
    doc.text(`#SC-${Date.now().toString().slice(-6)}`, rightColX + 40, 65, {align: 'right'});
    doc.text(date, rightColX + 40, 72, {align: 'right'});

    // 5. Tabla de Productos (Estilo Clean)
    const tableBody = cart.map(item => [
        item.quantity,
        item.name,
        `$${item.price.toFixed(2)}`,
        `$${(item.price * item.quantity).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 90,
        head: [['CANT.', 'DESCRIPCIÓN', 'PRECIO UNITARIO', 'IMPORTE']],
        body: tableBody,
        theme: 'plain', 
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: darkBlue, 
            fontStyle: 'bold',
            lineWidth: {bottom: 0.5},
            lineColor: [200, 200, 200]
        },
        styles: { textColor: [50, 50, 50], fontSize: 10, cellPadding: 4 },
        columnStyles: {
            0: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // 6. Totales
    let finalY = doc.lastAutoTable.finalY + 10;
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * 0.19; // IVA ejemplo
    const total = subtotal + tax;

    doc.text("Subtotal", 140, finalY);
    doc.text(`$${subtotal.toFixed(2)}`, 190, finalY, {align: 'right'});
    
    doc.text("IVA (19%)", 140, finalY + 7);
    doc.text(`$${tax.toFixed(2)}`, 190, finalY + 7, {align: 'right'});

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkBlue);
    doc.text("TOTAL", 140, finalY + 16);
    doc.text(`$${total.toFixed(2)}`, 190, finalY + 16, {align: 'right'});

    // 7. Footer "Gracias"
    doc.setFontSize(24);
    doc.setFont("times", "italic"); 
    doc.setTextColor(darkBlue);
    doc.text("Gracias", 20, 250);

    doc.save("Recibo_SpeedCollect.pdf");
    
    // Limpiar
    cart = [];
    localStorage.removeItem('cart');
    updateCartUI();
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    
    alert("¡Compra Exitosa! Tu recibo se ha descargado.");
}

// ==========================================
// 4. REGISTRO VISUAL (Banderas en tiempo real)
// ==========================================
function initRegisterStrict() {
    const phoneIn = document.getElementById('reg-phone');
    const flagDisplay = document.getElementById('flag-icon'); 
    const form = document.getElementById('register-form');
    const msg = document.getElementById('msg');

    if(phoneIn) {
        phoneIn.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            let detected = null;

            // Lógica de detección
            if(val.startsWith('57') || val.startsWith('3')) detected = COUNTRY_RULES[0]; // Colombia
            else if(val.startsWith('52')) detected = COUNTRY_RULES[1]; // Mexico
            else if(val.startsWith('1')) detected = COUNTRY_RULES[2]; // USA
            else if(val.startsWith('34') || val.startsWith('6') || val.startsWith('7')) detected = COUNTRY_RULES[3]; // España
            else if(val.startsWith('54')) detected = COUNTRY_RULES[4]; // Argentina
            else if(val.startsWith('56') || val.startsWith('9')) detected = COUNTRY_RULES[5]; // Chile

            const hint = document.getElementById('phone-hint') || createHint(phoneIn);

            if(detected) {
                if(flagDisplay) flagDisplay.innerHTML = `<span style="font-size: 1.5rem;">${detected.flag}</span>`;
                hint.innerText = `${detected.flag} ${detected.country}: ${detected.hint}`;
                
                if(!detected.pattern.test(val)) {
                    phoneIn.classList.add('is-invalid');
                    phoneIn.classList.remove('is-valid');
                } else {
                    phoneIn.classList.remove('is-invalid');
                    phoneIn.classList.add('is-valid');
                }
            } else {
                if(flagDisplay) flagDisplay.innerHTML = `<span style="font-size: 1.5rem;">🌐</span>`;
                hint.innerText = "Ingresa el número con prefijo (ej: 57...)";
                phoneIn.classList.remove('is-valid', 'is-invalid');
            }
        });
    }

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validaciones Estrictas antes de enviar
            const nameVal = document.getElementById('reg-name').value.trim();
            const passVal = document.getElementById('reg-pass').value;
            const phoneVal = phoneIn.value.replace(/\D/g, '');

            if(nameVal.split(' ').length > 3) return alert("El nombre no puede tener más de 3 palabras.");
            if(/(.)\1/.test(nameVal.toLowerCase())) return alert("El nombre tiene letras repetidas inválidas.");
            if(passVal.length < 10) return alert("La contraseña debe tener al menos 10 caracteres.");
            
            // Envío
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        name: nameVal,
                        email: document.getElementById('reg-email').value,
                        password: passVal,
                        phone: phoneVal
                    })
                });
                const data = await res.json();
                if(res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    alert("¡Registro Exitoso!");
                    window.location.href = 'index.html';
                } else {
                    msg.innerHTML = `<span class="text-danger">${data.message}</span>`;
                }
            } catch(err) {
                msg.innerHTML = "Error de conexión";
            }
        });
    }
}

function createHint(input) {
    const s = document.createElement('small');
    s.id = 'phone-hint';
    s.className = 'd-block mt-1 text-muted';
    input.parentNode.appendChild(s);
    return s;
}

// ==========================================
// 5. AUTH & ADMIN
// ==========================================
function checkAuthStatus() {
    const u = JSON.parse(localStorage.getItem('user'));
    const div = document.getElementById('auth-section');
    
    if(div && u) {
        const adminCrown = u.role === 'admin' ? 
            `<a href="admin.html" class="btn btn-warning btn-sm me-2 fw-bold shadow"><i class="fa-solid fa-crown"></i> ADMIN</a>` : '';
            
        div.innerHTML = `
            <div class="d-flex align-items-center">
                ${adminCrown}
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
        msg.innerHTML = 'Verificando...';
        
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

// ==========================================
// 6. FUNCIONES AUXILIARES (Carrito, Reseñas)
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
        
        // Toast
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

function logout() { localStorage.clear(); location.href = 'index.html'; }

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
    const user = JSON.parse(localStorage.getItem('user'));
    
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
            const c = document.getElementById('reviewsContainer');
            const newReview = `
                <div class="border border-secondary rounded p-2 mb-2 bg-dark">
                    <div class="d-flex justify-content-between">
                        <strong class="text-danger small">${user.name}</strong>
                        <span class="text-warning small">${'★'.repeat(rateIn.value)}</span>
                    </div>
                    <p class="text-light small mb-0 mt-1">${textIn.value}</p>
                </div>`;
            
            if(c.innerHTML.includes('Sé el primero')) c.innerHTML = '';
            c.insertAdjacentHTML('afterbegin', newReview);
            textIn.value = '';
        } else {
            alert("Error al guardar la reseña.");
        }
    } catch(err) { console.error(err); }
}