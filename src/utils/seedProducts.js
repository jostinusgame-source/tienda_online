const mysql = require('mysql2/promise');
const path = require('path');
// Ajusta la ruta del .env según tu estructura de carpetas
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🚧 Iniciando REINICIO total de la Base de Datos SpeedCollect...');
    
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 1. ELIMINAR TABLAS ANTIGUAS (Orden correcto por las llaves foráneas)
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['reviews', 'order_items', 'orders', 'products', 'users', 'settings', 'audit_logs'];
        for (const table of tables) {
            await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        }
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('🗑️ Tablas antiguas eliminadas.');

        // 2. CREAR TABLAS NUEVAS

        // A. Usuarios (Sin verificación, registro directo)
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

        // B. Productos (Con Categoría y Precio Decimal para USD)
        await connection.execute(`
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL, -- USD
                stock INT NOT NULL DEFAULT 0,
                category VARCHAR(100), -- 'Autos', 'Camisetas', 'Raros'
                image_url VARCHAR(500),
                model_url VARCHAR(500), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // C. Pedidos
        await connection.execute(`
            CREATE TABLE orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                total DECIMAL(10, 2),
                status VARCHAR(50) DEFAULT 'pending',
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // D. Items del Pedido
        await connection.execute(`
            CREATE TABLE order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                product_name VARCHAR(255),
                quantity INT,
                price DECIMAL(10, 2),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        // E. Reseñas (Reviews)
        await connection.execute(`
            CREATE TABLE reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        console.log('wd Estructura de tablas creada.');

        // 3. INSERTAR DATOS INICIALES (CATÁLOGO EN USD)
        
        const products = [

            
            // --- CATEGORÍA: AUTOS ---

            {
                name: 'Ferrari LaFerrari',
                description: 'Híbrido legendario. Escala 1:18.',
                price: 450.00, stock: 5, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800',
                // URL DE SKETCHFAB (Embed)
                model_url: 'https://sketchfab.com/models/2f778f5664da4449a05b225964894e63' 
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'Circuitos puros.',
                price: 280.00, stock: 10, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=800',
                model_url: 'https://sketchfab.com/models/d0d0f50974a4411186e2467d020d5754' 
            },
            {
                name: 'Ferrari LaFerrari Aperta',
                description: 'La máxima expresión híbrida de Maranello. Escala 1:18. Detalles en fibra de carbono real.',
                price: 450.00, stock: 5, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=800',
                model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Ferrari/glTF/Ferrari.gltf'
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'El rey de los circuitos. Acabado en Lizard Green con jaula antivuelco.',
                price: 280.00, stock: 10, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800'
            },
            {
                name: 'Bugatti Chiron Super Sport',
                description: '300+ mph. La ingeniería llevada al límite. Edición Carbono Azul.',
                price: 550.00, stock: 2, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1600712242805-5f786716a5d7?auto=format&fit=crop&w=800'
            },
            
            // --- CATEGORÍA: CAMISETAS (NUEVO) ---
            {
                name: 'T-Shirt Scuderia Ferrari 2025',
                description: 'Algodón Pima de alta calidad. Edición Oficial GP de Monza. Color Rosso Corsa.',
                price: 85.00, stock: 50, category: 'Camisetas',
                image_url: 'https://images.unsplash.com/photo-1580820027731-01185f096277?auto=format&fit=crop&w=800'
            },
            {
                name: 'Hoodie Porsche 911 Turbo Vintage',
                description: 'Sudadera negra con estampado clásico del Porsche 930 Turbo. Corte Oversize.',
                price: 120.00, stock: 30, category: 'Camisetas',
                image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800'
            },

            // --- CATEGORÍA: RAROS / COLECCIONABLES (NUEVO) ---
            {
                name: 'Casco Ayrton Senna 1994 (Replica)',
                description: 'Replica escala 1:1 certificada. Pintura a mano. Incluye vitrina de exhibición.',
                price: 1500.00, stock: 1, category: 'Raros',
                image_url: 'https://m.media-amazon.com/images/I/71u+1qL+Q+L._AC_SX679_.jpg'
            },
            {
                name: 'Neumático F1 Usado (Pirelli Soft)',
                description: 'Neumático real usado en pruebas de invierno 2023. Con certificado de autenticidad.',
                price: 3200.00, stock: 1, category: 'Raros',
                image_url: 'https://images.unsplash.com/photo-1578855673620-74e94b29ce45?auto=format&fit=crop&w=800'
            }
        ];

        for (const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [p.name, p.description, p.price, p.stock, p.category, p.image_url, p.model_url || null]
            );
        }

        console.log('🏁 ¡ÉXITO! Base de datos actualizada con USD, Camisetas y Productos Raros.');
        await connection.end();

    } catch (error) {
        console.error('❌ Error Fatal:', error);
    }
}

seedProducts();