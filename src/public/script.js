// IMPORTANTE: Si estás en local usa http://localhost:3000/api
// Si subes a Render, usa /api (ruta relativa)
const API_URL = '/api';

// --- UTILIDADES ---
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// --- VERIFICAR ESTADO LOGIN EN NAVBAR ---
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
        const user = getUser();
        if (user) {
            let adminBtn = user.role === 'admin' ? '<a href="admin.html" class="btn btn-danger me-2">Admin</a>' : '';
            navLinks.innerHTML = `
                <span class="text-white me-3">Hola, ${user.name}</span>
                ${adminBtn}
                <button onclick="logout()" class="btn btn-outline-light">Salir</button>
            `;
        }
    }
    
    // Si estamos en index, cargar productos
    if (document.getElementById('products-container')) {
        loadProducts();
    }
});

// --- REGISTRO (ACTUALIZADO CON TELÉFONO) ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtenemos los valores limpios
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-pass').value;
        const phone = document.getElementById('reg-phone').value; // <--- DATO NUEVO

        document.getElementById('msg').innerHTML = '<div class="alert alert-info">Procesando...</div>';

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, phone }) // Enviamos el teléfono
            });
            const data = await res.json();
            
            if (res.ok) {
                document.getElementById('msg').innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                setTimeout(() => window.location.href = 'login.html', 3000);
            } else {
                // Mostrar errores del backend
                const errorMsg = data.errors ? data.errors[0].msg : data.message;
                document.getElementById('msg').innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
            }
        } catch (error) {
            console.error(error);
            document.getElementById('msg').innerHTML = `<div class="alert alert-danger">Error de conexión</div>`;
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
                document.getElementById('msg').innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            console.error(error);
        }
    });
}

// --- CARGAR PRODUCTOS (PÚBLICO) ---
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        const products = await res.json();
        const container = document.getElementById('products-container');

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center">No hay productos disponibles aún.</p>';
            return;
        }

        container.innerHTML = products.map(p => `
            <div class="col-md-3 mb-4">
                <div class="card product-card h-100">
                    <img src="${p.image_url || 'https://via.placeholder.com/200'}" class="card-img-top" alt="${p.name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${p.name}</h5>
                        <p class="card-text text-muted">$${p.price}</p>
                        <p class="card-text small">${p.description || ''}</p>
                        <button class="btn btn-primary mt-auto">Agregar</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// --- ADMIN: CREAR PRODUCTO ---
const productForm = document.getElementById('product-form');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return alert('No autorizado');

        const product = {
            name: document.getElementById('p-name').value,
            price: parseFloat(document.getElementById('p-price').value),
            stock: parseInt(document.getElementById('p-stock').value),
            description: document.getElementById('p-desc').value,
            image_url: document.getElementById('p-img').value
        };

        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(product)
        });

        if (res.ok) {
            alert('Producto creado!');
            productForm.reset();
            loadAdminProducts(); // Recargar tabla
        } else {
            const data = await res.json();
            alert('Error: ' + data.message);
        }
    });
}

// --- ADMIN: LISTAR PRODUCTOS ---
async function loadAdminProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;

    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();

    list.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>$${p.price}</td>
            <td>${p.stock}</td>
            <td>
                <button onclick="deleteProduct(${p.id})" class="btn btn-danger btn-sm">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// --- ADMIN: ELIMINAR PRODUCTO ---
async function deleteProduct(id) {
    if(!confirm('¿Seguro que quieres eliminar este producto?')) return;

    const token = getToken();
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        loadAdminProducts();
    } else {
        alert('Error al eliminar');
    }
}