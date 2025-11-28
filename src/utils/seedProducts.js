const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔥 REINICIANDO BASE DE DATOS (MODO CORRECCIÓN)...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    // 1. BORRAR TODO (Para limpiar errores viejos)
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['reviews', 'order_items', 'orders', 'products', 'users'];
    for (const t of tables) await connection.execute(`DROP TABLE IF EXISTS ${t}`);
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // 2. CREAR TABLAS CORRECTAS
    await connection.execute(`
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(20) DEFAULT 'client',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await connection.execute(`
        CREATE TABLE products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255), description TEXT,
            price DECIMAL(10, 2), stock INT,
            category VARCHAR(50),
            image_url VARCHAR(500),
            model_url VARCHAR(500), -- Para el 3D
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await connection.execute(`
        CREATE TABLE reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT, product_id INT, rating INT, comment TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    `);

    await connection.execute(`CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255), total DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.execute(`CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, product_name VARCHAR(255), quantity INT, price DECIMAL(10,2))`);

    // 3. CREAR ADMIN HARDCODED (Para que puedas entrar al panel)
    const salt = await bcrypt.genSalt(10);
    const hashAdmin = await bcrypt.hash('admin123', salt); // Contraseña: admin123
    
    await connection.execute(
        `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
        ['Super Admin', 'admin@speedcollect.com', hashAdmin, '3001234567', 'admin']
    );
    console.log('👤 Admin creado: admin@speedcollect.com / admin123');

    // 4. PRODUCTOS CON 3D REAL (Sketchfab Embeds)
    const products = [
        {
            name: 'Ferrari LaFerrari',
            description: 'El híbrido definitivo. 963 CV. Escala 1:18.',
            price: 450.00, stock: 5, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800',
            model_url: 'https://sketchfab.com/models/2f778f5664da4449a05b225964894e63/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'Porsche 911 GT3 RS',
            description: 'La leyenda de Nürburgring en tu escritorio.',
            price: 280.00, stock: 10, category: 'Autos',
            image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=800',
            model_url: 'https://sketchfab.com/models/d0d0f50974a4411186e2467d020d5754/embed?autostart=1&ui_theme=dark'
        },
        {
            name: 'Camiseta Ferrari Oficial',
            description: 'Algodón Pima. Edición GP Monza.',
            price: 85.00, stock: 50, category: 'Camisetas',
            image_url: 'https://images.unsplash.com/photo-1580820027731-01185f096277?w=800',
            model_url: '' // Ropa sin 3D
        },
        {
            name: 'Casco Ayrton Senna 1994',
            description: 'Replica certificada escala 1:1.',
            price: 1500.00, stock: 1, category: 'Raros',
            image_url: 'https://m.media-amazon.com/images/I/71u+1qL+Q+L._AC_SX679_.jpg',
            model_url: 'https://sketchfab.com/models/e4f7a8a9a2d34a8a9a2d34a8a9a2d34a/embed?autostart=1&ui_theme=dark'
        }
    ];

    for (const p of products) {
        await connection.execute(
            'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [p.name, p.description, p.price, p.stock, p.category, p.image_url, p.model_url]
        );
    }

    console.log('✅ BASE DE DATOS LISTA Y CORREGIDA.');
    process.exit();
}

seedProducts();