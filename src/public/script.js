// Configuración API (Ruta relativa para que funcione en Render y Local)
const API_URL = '/api'; 

// Estado del Carrito (Array para guardar productos)
let cart = [];

// --- INICIALIZACIÓN ---
// Se ejecuta cuando la página termina de cargar
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si hay usuario logueado para ajustar el Navbar
    checkUserSession();
    
    // 2. Si estamos en la página principal (existe el contenedor de productos), cargar el catálogo
    if (document.getElementById('products-container')) {
        loadProducts();
    }
});

// ==========================================
// 1. GESTIÓN DE SESIÓN (AUTENTICACIÓN)
// ==========================================

function checkUserSession() {
    const userStr = localStorage.getItem('user');
    const authSection = document.getElementById('auth-section');
    
    // Si hay usuario guardado y el elemento del navbar existe
    if (userStr && authSection) {
        const user = JSON.parse(userStr);
        let adminLink = user.role === 'admin' ? '<li><a href="admin.html" class="dropdown-item text-danger fw-bold">PANEL ADMIN</a></li>' : '';
        
        // Reemplazamos el botón "LOGIN" por un menú desplegable con el nombre
        authSection.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light btn-sm rounded-0 dropdown-toggle text-uppercase" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fa-solid fa-user me-2"></i>${user.name}
                </button>
                <ul class="dropdown-menu dropdown-menu-dark rounded-0 shadow mt-2">
                    <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    ${adminLink}
                    <li><button onclick="logout()" class="dropdown-item text-white"><i class="fa-solid fa-right-from-bracket me-2"></i>Cerrar Sesión</button></li>
                </ul>
            </div>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html'; // Redirigir al inicio
}

// ==========================================
// 2. CATÁLOGO DE PRODUCTOS
// ==========================================

async function loadProducts() {
    const container = document.getElementById('products-container');
    const loader = document.getElementById('loader');

    try {
        const res = await fetch(`${API_URL}/products`);
        
        if (!res.ok) throw new Error('Error al conectar con el servidor');
        
        const products = await res.json();
        
        // Ocultar loader y mostrar contenedor
        if (loader) loader.classList.add('d-none');
        if (container) container.classList.remove('d-none');

        if (products.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted lead">No hay modelos disponibles por el momento.</p></div>';
            return;
        }

        // Generar HTML para cada producto
        container.innerHTML = products.map(p => {
            // Imagen por defecto si no hay URL válida
            const img = p.image_url && p.image_url.length > 5 ? p.image_url : 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
            
            // Lógica de Stock (Visual)
            let stockMsg, btnDisabled, btnText, badgeClass;
            
            if (p.stock > 5) {
                stockMsg = 'DISPONIBLE';
                badgeClass = 'bg-success text-white';
                btnDisabled = '';
                btnText = 'AÑADIR <i class="fa-solid fa-plus ms-1"></i>';
            } else if (p.stock > 0) {
                stockMsg = `¡SOLO ${p.stock}!`;
                badgeClass = 'bg-warning text-dark';
                btnDisabled = '';
                btnText = 'AÑADIR';
            } else {
                stockMsg = 'AGOTADO';
                badgeClass = 'bg-secondary text-white';
                btnDisabled = 'disabled';
                btnText = 'SIN STOCK';
            }

            return `
            <div class="col-md-6 col-lg-3">
                <div class="product-card h-100">
                    <div class="card-img-wrap">
                        <span class="badge-stock ${badgeClass}">${stockMsg}</span>
                        <img src="${img}" alt="${p.name}" loading="lazy">
                    </div>
                    <div class="product-info d-flex flex-column">
                        <h3 class="product-title text-truncate" title="${p.name}">${p.name}</h3>
                        <p class="small text-muted mb-2 text-truncate">${p.description || 'Edición coleccionista'}</p>
                        <div class="mt-auto">
                            <p class="product-price mb-0">$${parseFloat(p.price).toLocaleString()}</p>
                            <button class="btn-add-cart" onclick="addToCart(${p.id}, '${p.name}', ${p.price})" ${btnDisabled}>
                                ${btnText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error:', error);
        if (loader) loader.innerHTML = '<p class="text-danger text-center">Error cargando el catálogo. Por favor intenta recargar la página.</p>';
    }
}

// ==========================================
// 3. CARRITO DE COMPRAS
// ==========================================

function addToCart(id, name, price) {
    // Verificar si el producto ya está en el carrito
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    
    updateCartUI();
    
    // Feedback visual simple (Toast o Alerta)
    // alert(`Agregado: ${name}`); 
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    // A. Actualizar badge del navbar
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

    // B. Actualizar Modal del Carrito
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    
    // Si no existen los elementos (por ejemplo en login.html), salir
    if (!cartItemsContainer || !cartTotalElement) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fa-solid fa-cart-arrow-down fa-3x text-secondary mb-3"></i>
                <p class="text-muted">Tu garaje está vacío.</p>
            </div>`;
        cartTotalElement.textContent = '$0.00';
        return;
    }

    let total = 0;
    
    cartItemsContainer.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                <div class="me-2">
                    <h6 class="m-0 text-white text-truncate" style="max-width: 180px;">${item.name}</h6>
                    <small class="text-muted">$${parseFloat(item.price).toLocaleString()} x ${item.quantity}</small>
                </div>
                <div class="d-flex align-items-center">
                    <span class="text-danger fw-bold me-3">$${subtotal.toLocaleString()}</span>
                    <button onclick="removeFromCart(${item.id})" class="btn btn-sm btn-outline-secondary border-0 text-white hover-danger" title="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cartTotalElement.textContent = `$${total.toLocaleString()}`;
}

// ==========================================
// 4. CHAT IA (ENZO CONCIERGE)
// ==========================================

function toggleChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow) {
        chatWindow.classList.toggle('d-none');
        // Si se abre, enfocar el input
        if (!chatWindow.classList.contains('d-none')) {
            document.getElementById('ai-input').focus();
        }
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    
    if (!text) return;

    // 1. Mostrar mensaje del usuario
    appendMessage(text, 'user');
    input.value = '';

    // 2. Mostrar indicador de carga
    const loadingId = appendMessage('Consultando a Maranello...', 'bot', true);

    try {
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        
        // 3. Reemplazar carga con respuesta real
        removeMessage(loadingId);
        appendMessage(data.reply, 'bot');

    } catch (error) {
        removeMessage(loadingId);
        appendMessage('Lo siento, el sistema de comunicaciones está ocupado. Intenta de nuevo.', 'bot');
        console.error('Error chat:', error);
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
    
    if (isLoading) {
        div.style.fontStyle = 'italic';
        div.style.opacity = '0.7';
    }
    
    messages.appendChild(div);
    // Auto-scroll al fondo
    messages.scrollTop = messages.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}