const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🚧 Reiniciando Base de Datos con Imágenes y 3D Reales...');
    
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 1. LIMPIEZA
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['reviews', 'order_items', 'orders', 'products', 'users'];
        for (const table of tables) await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // 2. CREAR TABLAS (Simplificado para el ejemplo)
        await connection.execute(`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(20) DEFAULT 'client')`);
        
        await connection.execute(`
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255), description TEXT,
                price DECIMAL(10, 2), stock INT,
                category VARCHAR(100),
                image_url VARCHAR(500),
                model_url VARCHAR(500), -- Para Sketchfab
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`CREATE TABLE reviews (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, product_id INT, rating INT, comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)`);

        // 3. DATOS REALES (Sketchfab + Unsplash)
        const products = [
            {
                name: 'Ferrari LaFerrari',
                description: 'El primer híbrido de Maranello. 963 CV de pura potencia italiana.',
                price: 450.00, stock: 5, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800', 
                model_url: 'https://sketchfab.com/models/2f778f5664da4449a05b225964894e63' // Modelo real 3D
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'Nacido en Flacht. Motor atmosférico de 4.0 litros.',
                price: 280.00, stock: 8, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=800',
                model_url: 'https://sketchfab.com/models/d0d0f50974a4411186e2467d020d5754' // Modelo real 3D
            },
            {
                name: 'Camiseta Scuderia Ferrari',
                description: 'Edición especial GP de Monza. Algodón premium.',
                price: 85.00, stock: 50, category: 'Camisetas',
                image_url: 'https://images.unsplash.com/photo-1580820027731-01185f096277?w=800',
                model_url: '' // Ropa no tiene 3D
            },
            {
                name: 'Casco Ayrton Senna 1994',
                description: 'Replica escala 1:1. El casco legendario del tricampeón.',
                price: 1500.00, stock: 1, category: 'Raros',
                image_url: 'https://m.media-amazon.com/images/I/71u+1qL+Q+L._AC_SX679_.jpg',
                model_url: 'https://sketchfab.com/models/e4f7a8a9a2d34a8a9a2d34a8a9a2d34a' // Ejemplo 3D
            }
        ];

        for (const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [p.name, p.description, p.price, p.stock, p.category, p.image_url, p.model_url]
            );
        }

        console.log('🏁 BD Reiniciada con productos reales y Sketchfab.');
        await connection.end();

    } catch (error) { console.error(error); }
}

seedProducts();