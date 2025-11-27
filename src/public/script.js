// Configuración API (Ruta relativa para Render)
const API_URL = '/api'; 

// Estado del Carrito
let cart = [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    
    // Si estamos en la página principal (index.html), cargar productos
    if (document.getElementById('products-container')) {
        loadProducts();
    }
});

// --- SESIÓN DE USUARIO ---
function checkUserSession() {
    const userStr = localStorage.getItem('user');
    const authSection = document.getElementById('auth-section');
    
    // Si el elemento auth-section existe (estamos en index.html)
    if (userStr && authSection) {
        const user = JSON.parse(userStr);
        let adminLink = user.role === 'admin' ? '<a href="admin.html" class="dropdown-item text-danger">Panel Admin</a>' : '';
        
        authSection.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light btn-sm rounded-0 dropdown-toggle text-uppercase" type="button" data-bs-toggle="dropdown">
                    ${user.name}
                </button>
                <ul class="dropdown-menu dropdown-menu-dark rounded-0 shadow">
                    <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li>${adminLink}</li>
                    <li><button onclick="logout()" class="dropdown-item">Cerrar Sesión</button></li>
                </ul>
            </div>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html'; // Redirigir al inicio o recargar
}

// --- REGISTRO (CON REDIRECCIÓN A VERIFICACIÓN) ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-pass').value;
        const phone = document.getElementById('reg-phone').value;

        const msgDiv = document.getElementById('msg');
        msgDiv.innerHTML = '<div class="alert alert-info">Procesando registro...</div>';

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, phone })
            });
            const data = await res.json();
            
            if (res.ok) {
                // Guardamos el email para que la página de verificación sepa quién es
                localStorage.setItem('pendingEmail', email);
                
                msgDiv.innerHTML = `<div class="alert alert-success">¡Éxito! Redirigiendo a verificación...</div>`;
                
                // --- REDIRECCIÓN AUTOMÁTICA ---
                setTimeout(() => {
                    window.location.href = 'verify.html';
                }, 1500);
            } else {
                const errorMsg = data.errors ? data.errors[0].msg : data.message;
                msgDiv.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
            }
        } catch (error) {
            console.error(error);
            msgDiv.innerHTML = `<div class="alert alert-danger">Error de conexión con el servidor.</div>`;
        }
    });
}

// --- LOGIN ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;
        const msgDiv = document.getElementById('msg');

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                // Si la cuenta no está verificada (status 403), redirigir
                if (res.status === 403 && data.needsVerification) {
                    localStorage.setItem('pendingEmail', data.email);
                    msgDiv.innerHTML = `<div class="alert alert-warning">${data.message}. Redirigiendo...</div>`;
                    setTimeout(() => window.location.href = 'verify.html', 2000);
                } else {
                    msgDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            }
        } catch (error) {
            console.error(error);
            msgDiv.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
        }
    });
}

// --- CATÁLOGO DE PRODUCTOS ---
async function loadProducts() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');

    try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) throw new Error('Error en la red');
        
        const products = await res.json();
        
        // Ocultar loader y mostrar contenedor
        if(loader) loader.classList.add('d-none');
        if(container) container.classList.remove('d-none');

        if (products.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><p>No hay modelos disponibles en este momento.</p></div>';
            return;
        }

        container.innerHTML = products.map(p => {
            // Imagen por defecto si no hay URL válida
            const img = p.image_url && p.image_url.length > 5 ? p.image_url : 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
            
            // Lógica de Stock
            const stockMsg = p.stock > 0 ? `${p.stock} DISPONIBLES` : 'AGOTADO';
            const btnDisabled = p.stock === 0 ? 'disabled' : '';
            const btnText = p.stock === 0 ? 'SIN STOCK' : 'AÑADIR';

            return `
            <div class="col-md-6 col-lg-3">
                <div class="product-card">
                    <div class="card-img-wrap">
                        <span class="badge-stock">${stockMsg}</span>
                        <img src="${img}" alt="${p.name}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title text-truncate" title="${p.name}">${p.name}</h3>
                        <p class="product-price">$${parseFloat(p.price).toLocaleString()}</p>
                        <button class="btn-add-cart" onclick="addToCart(${p.id}, '${p.name}', ${p.price})" ${btnDisabled}>
                            ${btnText}
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error:', error);
        if(loader) loader.innerHTML = '<p class="text-danger">Error cargando el catálogo. Intenta recargar.</p>';
    }
}

// --- LÓGICA DEL CARRITO ---
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    
    updateCartUI();
    // Feedback rápido (opcional)
    // alert(`Añadido: ${name}`); 
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    // 1. Actualizar badge del navbar
    const countBadge = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (countBadge) {
        if (totalItems > 0) {
            countBadge.style.display = 'block';
            countBadge.textContent = totalItems;
        } else {
            countBadge.style.display = 'none';
        }
    }

    // 2. Actualizar Modal
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    
    if (!cartItemsContainer || !cartTotalElement) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-muted py-3">Tu garaje está vacío.</p>';
        cartTotalElement.textContent = '$0.00';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                <div>
                    <h6 class="m-0 text-white">${item.name}</h6>
                    <small class="text-muted">$${item.price} x ${item.quantity}</small>
                </div>
                <div class="d-flex align-items-center">
                    <span class="text-danger fw-bold me-3">$${subtotal.toLocaleString()}</span>
                    <button onclick="removeFromCart(${item.id})" class="btn btn-sm btn-outline-secondary border-0 text-white">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cartTotalElement.textContent = `$${total.toLocaleString()}`;
}

// --- LOGICA DEL CHAT CON IA (ENZO) ---

function toggleChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    if(chatWindow) chatWindow.classList.toggle('d-none');
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('ai-input');
    const messages = document.getElementById('ai-messages');
    const text = input.value.trim();
    
    if (!text) return;

    // 1. Mostrar mensaje del usuario
    appendMessage(text, 'user');
    input.value = '';

    // 2. Mostrar "Escribiendo..."
    const loadingId = appendMessage('Consultando a Maranello...', 'bot', true);

    try {
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        
        // 3. Reemplazar loading con respuesta
        removeMessage(loadingId);
        appendMessage(data.reply, 'bot');

    } catch (error) {
        removeMessage(loadingId);
        appendMessage('El sistema de comunicaciones está ocupado. Intenta de nuevo.', 'bot');
    }
}

function appendMessage(text, sender, isLoading = false) {
    const messages = document.getElementById('ai-messages');
    if (!messages) return;

    const div = document.createElement('div');
    const id = Date.now();
    div.id = id;
    div.className = `ai-msg ai-msg-${sender}`;
    div.innerText = text;
    if (isLoading) div.style.fontStyle = 'italic';
    
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}