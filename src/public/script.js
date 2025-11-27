const API_URL = '/api'; 
let cart = [];
let allProducts = []; // Copia local para manejar stock visual

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    if(document.getElementById('products-container')) loadProducts();
    setupPaymentValidation();
});

// --- SESIÓN ---
function checkSession() {
    const user = JSON.parse(localStorage.getItem('user'));
    const authDiv = document.getElementById('auth-section');
    if(user && authDiv) {
        authDiv.innerHTML = `<button onclick="logout()" class="btn btn-outline-danger btn-sm text-uppercase"><i class="fa fa-user"></i> ${user.name} (Salir)</button>`;
    }
}
function logout() { localStorage.clear(); window.location.href = 'index.html'; }

// --- CATÁLOGO ---
async function loadProducts() {
    const cont = document.getElementById('products-container');
    const loader = document.getElementById('loader');
    
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) throw new Error('Error API');
        allProducts = await res.json(); // Guardamos copia
        
        loader.classList.add('d-none');
        cont.classList.remove('d-none');
        renderProducts(allProducts);
    } catch (e) {
        console.error(e);
        loader.innerHTML = '<p class="text-danger">Error conectando con el servidor.</p>';
    }
}

function renderProducts(products) {
    const cont = document.getElementById('products-container');
    if(!products.length) { cont.innerHTML = '<p>Sin stock.</p>'; return; }

    cont.innerHTML = products.map(p => {
        const img = p.image_url || 'https://images.unsplash.com/photo-1592198084033-aade902d1aae';
        // Stock visual local
        const inCart = cart.find(c => c.id === p.id);
        const cartQty = inCart ? inCart.quantity : 0;
        const realStock = p.stock - cartQty;
        
        const isOut = realStock <= 0;
        const btnState = isOut ? 'disabled' : '';
        const btnText = isOut ? 'AGOTADO' : 'AGREGAR';
        const badge = isOut ? 'bg-secondary' : 'bg-success';

        return `
        <div class="col-md-4 mb-4">
            <div class="product-card h-100 bg-dark text-white border border-secondary p-3 position-relative">
                <span class="position-absolute top-0 end-0 m-3 badge ${badge}">${realStock} Disp.</span>
                <div class="card-img-wrap" onclick="open3D('${p.name}')" style="cursor:pointer">
                    <img src="${img}" class="img-fluid" style="height:200px; object-fit:contain; width:100%">
                    <div class="overlay-3d"><i class="fa-solid fa-cube fa-2x text-white"></i></div>
                </div>
                <h5 class="mt-3 text-uppercase fw-bold">${p.name}</h5>
                <p class="text-danger fs-5 fw-bold">$${p.price}</p>
                <button class="btn btn-outline-light w-100" onclick="addToCart(${p.id})" ${btnState}>${btnText}</button>
            </div>
        </div>`;
    }).join('');
}

// --- CARRITO & STOCK REAL TIME ---
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    const existing = cart.find(i => i.id === id);
    const currentQty = existing ? existing.quantity : 0;

    if(currentQty >= product.stock) {
        alert('¡No hay más stock disponible!');
        return;
    }

    if(existing) existing.quantity++;
    else cart.push({...product, quantity: 1});

    updateCartUI();
    renderProducts(allProducts); // Re-renderizar para actualizar el badge de stock
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
    renderProducts(allProducts);
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    count.textContent = totalItems;
    count.style.display = totalItems > 0 ? 'block' : 'none';

    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if(!cart.length) {
        list.innerHTML = '<p class="text-center text-muted">Tu garaje está vacío.</p>';
        totalEl.textContent = '$0.00';
        return;
    }

    let total = 0;
    list.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
        <div class="d-flex justify-content-between mb-2 border-bottom border-secondary pb-2">
            <div>
                <small class="text-white d-block">${item.name}</small>
                <small class="text-muted">$${item.price} x ${item.quantity}</small>
            </div>
            <button onclick="removeFromCart(${item.id})" class="btn btn-sm text-danger"><i class="fa fa-trash"></i></button>
        </div>`;
    }).join('');
    totalEl.textContent = `$${total.toLocaleString()}`;
}

// --- PAGOS (VALIDACIÓN LUHN & NEQUI) ---
function openPaymentModal() {
    if(!cart.length) return alert('El carrito está vacío');
    const auth = localStorage.getItem('token');
    if(!auth) return window.location.href = 'login.html';
    
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    document.getElementById('cartModal').querySelector('.btn-close').click(); // Cerrar carrito
    modal.show();
}

function setupPaymentValidation() {
    // Tarjeta
    document.getElementById('card-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const ccNum = document.getElementById('cc-number').value.replace(/\s/g, '');
        if(!luhnCheck(ccNum)) return alert('Tarjeta Inválida (Error de Banco)');
        if(document.getElementById('cc-cvv').value.length < 3) return alert('CVV Inválido');
        
        processOrder('Tarjeta');
    });

    // Nequi
    document.getElementById('nequi-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('nequi-phone').value;
        if(phone.length < 10) return alert('Número Nequi incompleto');
        
        processOrder('Nequi');
    });
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
            alert(`¡Pago con ${method} Aprobado! Tu Ferrari va en camino. 🏎️`);
            cart = [];
            updateCartUI();
            window.location.reload();
        } else {
            alert('Error procesando el pago.');
        }
    } catch(e) { alert('Error de red'); }
}

// --- VISOR 3D ---
window.open3D = (name) => {
    const modal = new bootstrap.Modal(document.getElementById('view3DModal'));
    const viewer = document.getElementById('modal-viewer-3d');
    // Usamos modelo genérico para el demo, pero aquí podrías cambiar la URL según el producto
    viewer.src = "https://modelviewer.dev/shared-assets/models/Astronaut.glb"; 
    modal.show();
}