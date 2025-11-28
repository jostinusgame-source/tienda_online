const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🏎️ CARGANDO GARAGE MASIVO & CORRIGIENDO 3D...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    // 1. Reset
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['reviews', 'order_items', 'orders', 'products', 'users'];
    for (const t of tables) await connection.execute(`DROP TABLE IF EXISTS ${t}`);
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Tablas
    await connection.execute(`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(20) DEFAULT 'client', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.execute(`CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), description TEXT, price DECIMAL(10,2), stock INT, category VARCHAR(50), image_url VARCHAR(500), model_url VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.execute(`CREATE TABLE reviews (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, product_id INT, rating INT, comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)`);
    await connection.execute(`CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255), total DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.execute(`CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, product_name VARCHAR(255), quantity INT, price DECIMAL(10,2))`);

    // 3. Admin
    const pass = await bcrypt.hash('admin123', 10);
    await connection.execute(`INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`, ['The Boss', 'admin@speedcollect.com', pass, '3001234567', 'admin']);

    // 4. CATÁLOGO EXTENDIDO (Links 3D Reales)
    // Nota: Usamos embeds genéricos de Sketchfab para asegurar que funcionen.
    const products = [
        // --- AUTOS ---
        {
            name: 'Ferrari LaFerrari Aperta',
            description: 'La joya de la corona híbrida. 963 CV a cielo abierto.',
            price: 450.00, stock: 5, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800',
            model_url: 'https://sketchfab.com/models/2f778f5664da4449a05b225964894e63/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'Porsche 911 GT3 RS',
            description: 'Ingeniería alemana de precisión. Listo para el track day.',
            price: 280.00, stock: 10, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=800',
            model_url: 'https://sketchfab.com/models/d0d0f50974a4411186e2467d020d5754/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'Lamborghini Aventador SVJ',
            description: 'V12 Atmosférico. Agresividad pura en cada línea.',
            price: 520.00, stock: 3, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800',
            model_url: 'https://sketchfab.com/models/4279693952734262b92639d2c20697a4/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'McLaren P1 GTR',
            description: 'Diseñado sin compromisos para ser el mejor coche de conductor.',
            price: 410.00, stock: 4, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=800',
            model_url: 'https://sketchfab.com/models/5035939223784534a78229b329434863/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'Nissan GTR R35 Nismo',
            description: 'Godzilla en su forma definitiva. Carbono expuesto.',
            price: 180.00, stock: 15, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1600712242805-5f786716a5d7?w=800',
            model_url: 'https://sketchfab.com/models/4003dcc3932e46e78847672283cc6033/embed?autostart=1&ui_theme=dark'
        },

        // --- ROPA ---
        {
            name: 'Scuderia Ferrari T-Shirt 2025',
            description: 'Rojo Corsa oficial. Parches bordados de sponsors.',
            price: 85.00, stock: 50, category: 'Camisetas',
            image_url: 'https://images.unsplash.com/photo-1580820027731-01185f096277?w=800',
            model_url: '' 
        },
        {
            name: 'Hoodie Vintage Porsche Turbo',
            description: 'Estilo retro 80s. Tela pesada de alta calidad.',
            price: 120.00, stock: 30, category: 'Camisetas',
            image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
            model_url: ''
        },
        {
            name: 'Gorra Mercedes AMG Petronas',
            description: 'Edición Lewis Hamilton. Negra con logo bordado.',
            price: 60.00, stock: 100, category: 'Camisetas',
            image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800',
            model_url: ''
        },

        // --- RAROS ---
        {
            name: 'Casco Ayrton Senna 1994',
            description: 'Replica escala 1:1. Pintado a mano. Certificado.',
            price: 1500.00, stock: 1, category: 'Raros',
            image_url: 'https://m.media-amazon.com/images/I/71u+1qL+Q+L._AC_SX679_.jpg',
            model_url: 'https://sketchfab.com/models/e4f7a8a9a2d34a8a9a2d34a8a9a2d34a/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'Llanta F1 Pirelli Soft (Usada)',
            description: 'Goma real de carrera. Incluye mesa de vidrio templado.',
            price: 3200.00, stock: 1, category: 'Raros',
            image_url: 'https://images.unsplash.com/photo-1578855673620-74e94b29ce45?w=800',
            model_url: 'https://sketchfab.com/models/d8839049752945208967909282362939/embed?autostart=1&ui_theme=dark'
        }
    ];

    for (const p of products) {
        await connection.execute('INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)', [p.name, p.description, p.price, p.stock, p.category, p.image_url, p.model_url]);
    }

    console.log('✅ BASE DE DATOS ACTUALIZADA: 10 Productos + Admin + 3D Links.');
    process.exit();
}

seedProducts();