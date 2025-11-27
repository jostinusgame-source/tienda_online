const API_URL = '/api'; 
let cart = [];
let allProducts = [];
let iti = null;

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    
    // Inicializaciones condicionales según la página
    if (document.getElementById('products-container')) loadProducts();
    if (document.getElementById('register-form')) setupRegister();
    if (document.getElementById('login-form')) setupLogin();
    if (document.getElementById('forgot-link')) setupForgot();
    
    setupPaymentValidation();
});

// --- SESIÓN ---
function checkSession() {
    const userStr = localStorage.getItem('user');
    const authDiv = document.getElementById('auth-section');
    if(userStr && authDiv) {
        const user = JSON.parse(userStr);
        authDiv.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-danger btn-sm dropdown-toggle text-uppercase fw-bold" type="button" data-bs-toggle="dropdown">
                    <i class="fa fa-user me-1"></i> ${user.name}
                </button>
                <ul class="dropdown-menu dropdown-menu-dark shadow">
                    <li><a class="dropdown-item" href="#" onclick="logout()">Cerrar Sesión</a></li>
                </ul>
            </div>`;
    }
}
function logout() { localStorage.clear(); window.location.href = 'index.html'; }

// --- OLVIDASTE TU LLAVE ---
function setupForgot() {
    const link = document.getElementById('forgot-link');
    if(link) {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt("Ingresa tu correo para recuperar la llave:");
            if(!email) return;

            try {
                const res = await fetch(`${API_URL}/auth/forgot-password`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                alert(data.message);
                
                if (res.ok) {
                    // Flujo simple: pedir código y nueva pass en prompts (o redirigir a una página nueva)
                    const code = prompt("Revisa tu correo e ingresa el CÓDIGO aquí:");
                    const newPass = prompt("Ingresa tu NUEVA contraseña:");
                    
                    if(code && newPass) {
                        const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
                            method: 'POST', headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ email, code, newPassword: newPass })
                        });
                        const resetData = await resetRes.json();
                        alert(resetData.message);
                    }
                }
            } catch(err) { alert('Error de conexión'); }
        });
    }
}

// --- REGISTRO & TELÉFONO INTELIGENTE ---
function setupRegister() {
    const phoneInput = document.querySelector("#reg-phone");
    
    // Configuración Internacional
    iti = window.intlTelInput(phoneInput, {
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
        initialCountry: "auto",
        geoIpLookup: c => fetch("https://ipapi.co/json").then(r=>r.json()).then(d=>c(d.country_code)).catch(()=>c("us")),
        preferredCountries: ["co", "mx", "us", "es"],
        separateDialCode: true
    });

    // DETECCIÓN COLOMBIA AUTOMÁTICA
    phoneInput.addEventListener('input', () => {
        const val = phoneInput.value;
        if (val.startsWith('3') && val.length > 2) {
            if(iti.getSelectedCountryData().iso2 !== 'co') iti.setCountry('co');
        }
    });

    // Validación y Envío
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset errores visuales
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        let hasError = false;

        // Validar Teléfono
        if (!iti.isValidNumber()) {
            phoneInput.classList.add('is-invalid');
            document.getElementById('phone-error').textContent = "Número inválido para el país seleccionado";
            document.getElementById('phone-error').classList.remove('d-none');
            hasError = true;
        }

        // Validar Nombre (Mín 2 palabras)
        const nameIn = document.getElementById('reg-name');
        if (nameIn.value.trim().split(' ').length < 2) {
            nameIn.classList.add('is-invalid');
            document.getElementById('name-error').textContent = "Ingresa nombre y apellido";
            document.getElementById('name-error').classList.remove('d-none');
            hasError = true;
        }

        if(hasError) return;

        const data = {
            name: nameIn.value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-pass').value,
            phone: iti.getNumber()
        };

        const msg = document.getElementById('msg');
        msg.innerHTML = '<div class="spinner-border spinner-border-sm text-danger"></div>';

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
            });
            const json = await res.json();
            
            if (res.ok) {
                localStorage.setItem('pendingEmail', data.email);
                window.location.href = 'verify.html';
            } else {
                msg.innerHTML = `<div class="text-danger small">${json.message}</div>`;
            }
        } catch (err) { msg.textContent = 'Error conexión'; }
    });
}

function setupLogin() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-pass').value
        };
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
            });
            const json = await res.json();
            if(res.ok) {
                localStorage.setItem('user', JSON.stringify(json.user));
                localStorage.setItem('token', json.token);
                window.location.href = 'index.html';
            } else {
                if(json.needsVerification) {
                    localStorage.setItem('pendingEmail', json.email);
                    window.location.href = 'verify.html';
                } else {
                    document.getElementById('msg').innerText = json.message;
                }
            }
        } catch(e) { alert('Error conexión'); }
    });
}

// --- CATÁLOGO & STOCK REAL TIME ---
async function loadProducts() {
    const cont = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    
    try {
        console.log("Cargando productos...");
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) throw new Error('Falló API');
        allProducts = await res.json();
        
        loader.classList.add('d-none');
        cont.classList.remove('d-none');
        renderProducts(allProducts);
        updateCartUI();
    } catch (e) {
        console.error(e);
        loader.innerHTML = '<button class="btn btn-outline-light" onclick="location.reload()">Reintentar Conexión</button>';
    }
}

function renderProducts(products) {
    const cont = document.getElementById('products-container');
    if(!products || !products.length) { cont.innerHTML = '<p>Sin stock.</p>'; return; }

    cont.innerHTML = products.map(p => {
        const img = p.image_url || 'https://images.unsplash.com/photo-1592198084033-aade902d1aae';
        
        // CÁLCULO DE STOCK VISUAL
        const inCart = cart.find(c => c.id === p.id);
        const qtyInCart = inCart ? inCart.quantity : 0;
        const realStock = p.stock - qtyInCart;
        
        const isOut = realStock <= 0;
        
        return `
        <div class="col-md-4 mb-4">
            <div class="product-card h-100 bg-dark text-white border border-secondary p-3 position-relative">
                <span class="position-absolute top-0 end-0 m-3 badge ${isOut ? 'bg-secondary' : 'bg-success'}">
                    ${isOut ? 'AGOTADO' : realStock + ' Disp.'}
                </span>
                <div class="card-img-wrap" onclick="open3D('${p.name}')" style="cursor:pointer">
                    <img src="${img}" class="img-fluid" style="height:200px; object-fit:contain; width:100%">
                    <div class="overlay-3d"><i class="fa-solid fa-cube fa-2x"></i></div>
                </div>
                <h5 class="mt-3 text-uppercase fw-bold">${p.name}</h5>
                <p class="text-danger fs-5 fw-bold">$${p.price}</p>
                <button class="btn btn-ferrari w-100" onclick="addToCart(${p.id})" ${isOut ? 'disabled' : ''}>
                    ${isOut ? 'SIN STOCK' : 'AGREGAR'}
                </button>
            </div>
        </div>`;
    }).join('');
}

function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    const existing = cart.find(i => i.id === id);
    const currentQty = existing ? existing.quantity : 0;

    if(currentQty >= product.stock) {
        alert('Stock máximo alcanzado.');
        return;
    }

    if(existing) existing.quantity++;
    else cart.push({...product, quantity: 1});

    updateCartUI();
    renderProducts(allProducts); // Redibuja para bajar el contador de stock
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
    renderProducts(allProducts); // Redibuja para subir el contador de stock
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    if(count) {
        const total = cart.reduce((s, i) => s + i.quantity, 0);
        count.innerText = total;
        count.style.display = total > 0 ? 'block' : 'none';
    }
    
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if(!list) return;

    if(!cart.length) {
        list.innerHTML = '<p class="text-center text-muted">Vacío.</p>';
        totalEl.innerText = '$0.00';
        return;
    }

    let total = 0;
    list.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
        <div class="d-flex justify-content-between border-bottom border-secondary mb-2 pb-2">
            <div><small>${item.name}</small><br><small class="text-muted">${item.quantity} x $${item.price}</small></div>
            <button onclick="removeFromCart(${item.id})" class="btn btn-sm text-danger"><i class="fa fa-trash"></i></button>
        </div>`;
    }).join('');
    totalEl.innerText = `$${total.toLocaleString()}`;
}

// --- PAGOS & 3D ---
function openPaymentModal() {
    if(!cart.length) return alert('Carrito vacío');
    if(!localStorage.getItem('token')) return window.location.href = 'login.html';
    
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

window.open3D = (name) => {
    const modal = new bootstrap.Modal(document.getElementById('view3DModal'));
    const viewer = document.getElementById('modal-viewer-3d');
    // Modelo de ejemplo Buggy
    viewer.src = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Buggy/glTF-Binary/Buggy.glb";
    modal.show();
}

function setupPaymentValidation() {
    const form = document.getElementById('card-form');
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const num = document.getElementById('cc-number').value.replace(/\D/g, '');
            if(!luhnCheck(num)) return alert('Tarjeta Inválida (Rechazada por Banco)');
            alert('¡Pago Exitoso! Tu Ferrari va en camino.');
            cart = [];
            updateCartUI();
            renderProducts(allProducts);
            window.location.reload();
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