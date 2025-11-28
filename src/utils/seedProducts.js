const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔌 Conectando para reconstruir base de datos...');
    
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 1. LIMPIEZA Y CREACIÓN DE TABLAS (Orden correcto por llaves foráneas)
        await connection.execute('DROP TABLE IF EXISTS reviews');
        await connection.execute('DROP TABLE IF EXISTS order_items');
        await connection.execute('DROP TABLE IF EXISTS orders');
        await connection.execute('DROP TABLE IF EXISTS products');
        // No borramos users para no perder tu admin, pero aseguramos la tabla
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                phone VARCHAR(50),
                role VARCHAR(20) DEFAULT 'client',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla Productos
        await connection.execute(`
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(15, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                image_url VARCHAR(500),
                model_url VARCHAR(500), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla Reseñas
        await connection.execute(`
            CREATE TABLE reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT,
                user_name VARCHAR(100),
                rating INT,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        // Tabla Pedidos
        await connection.execute(`
            CREATE TABLE orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                total DECIMAL(15, 2),
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. INSERTAR CATÁLOGO ROBUSTO (Imágenes estables)
        const products = [
            {
                name: 'Ferrari LaFerrari',
                description: 'Híbrido V12. La cumbre tecnológica de Maranello.',
                price: 4500000, stock: 3,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/LaFerrari_in_Beverly_Hills_%287614%29.jpg',
                model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Ferrari/glTF/Ferrari.gltf'
            },
            {
                name: 'Bugatti Chiron',
                description: 'El coche de producción más rápido y lujoso del mundo.',
                price: 3200000, stock: 2,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Bugatti_Chiron_%2836559710091%29.jpg',
                model_url: ''
            },
            {
                name: 'Lamborghini Aventador SVJ',
                description: 'Aerodinámica activa y V12 atmosférico puro.',
                price: 850000, stock: 5,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Lamborghini_Aventador_SVJ_Jota_%28front%29.jpg/1200px-Lamborghini_Aventador_SVJ_Jota_%28front%29.jpg',
                model_url: ''
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'Un coche de carreras legal para la calle.',
                price: 350000, stock: 10,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Porsche_991_GT3_RS_Front.jpg',
                model_url: 'https://modelviewer.dev/shared-assets/models/Porsche911GT2.glb'
            },
            {
                name: 'McLaren P1',
                description: 'Hypercar híbrido diseñado para el circuito.',
                price: 1800000, stock: 4,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/McLaren_P1.jpg',
                model_url: ''
            },
            {
                name: 'Koenigsegg Agera RS',
                description: 'Record mundial de velocidad máxima (277 mph).',
                price: 5000000, stock: 1,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Koenigsegg_Agera_RS_Naraya_at_GIMS_2018_01.jpg',
                model_url: ''
            },
            {
                name: 'Pagani Huayra',
                description: 'Arte sobre ruedas con aerodinámica activa.',
                price: 2600000, stock: 2,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Pagani_Huayra_Geneva_Motor_Show_2011.jpg',
                model_url: ''
            },
            {
                name: 'Aston Martin Valkyrie',
                description: 'Fórmula 1 con matrícula.',
                price: 3500000, stock: 1,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Aston_Martin_Valkyrie_GIMS_2019_Le_Grand-Saconnex_GIMS0027.jpg',
                model_url: ''
            },
            {
                name: 'Ford GT',
                description: 'El renacimiento de la leyenda de Le Mans.',
                price: 600000, stock: 6,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/2018_Ford_GT_3.5.jpg',
                model_url: ''
            },
            {
                name: 'Shelby Cobra 427',
                description: 'Clásico americano. Potencia bruta sin filtros.',
                price: 1500000, stock: 3,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/1966_Shelby_Cobra_427_S-C.jpg',
                model_url: ''
            }
        ];

        for (const p of products) {
            const [res] = await connection.execute(
                'INSERT INTO products (name, description, price, stock, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?)',
                [p.name, p.description, p.price, p.stock, p.image_url, p.model_url || null]
            );
            
            // Insertar reseñas falsas iniciales
            await connection.execute('INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)', 
                [res.insertId, 'Usuario Verificado', 5, '¡Increíble máquina! El detalle es impresionante.']);
        }

        console.log('🏁 Base de datos reconstruida con éxito.');
        await connection.end();
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

seedProducts();