const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('📂 CARGANDO CATÁLOGO MANUAL (EDITABLE 1 POR 1)...');
    
    if (!process.env.DB_HOST) { console.error('❌ Error: Falta configurar .env'); process.exit(1); }

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        // 1. REINICIO DE TABLAS
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['reviews', 'order_items', 'orders', 'products', 'users'];
        for (const t of tables) await connection.execute(`DROP TABLE IF EXISTS ${t}`);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // 2. CREACIÓN DE TABLAS
        await connection.execute(`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(20) DEFAULT 'client', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // Tabla products con soporte para modelo local
        await connection.execute(`CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), description TEXT, price DECIMAL(10,2), stock INT, category VARCHAR(50), image_url VARCHAR(500), model_url VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        await connection.execute(`CREATE TABLE reviews (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, product_id INT, rating INT, comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)`);
        await connection.execute(`CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255), total DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await connection.execute(`CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, product_name VARCHAR(255), quantity INT, price DECIMAL(10,2))`);

        // ADMIN
        const pass = await bcrypt.hash('admin123', 10);
        await connection.execute(`INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`, ['CEO SpeedCollect', 'jsusgamep@itc.edu.co', pass, '3222625352', 'admin']);

        // =================================================================================
        // 🚨 LISTA DE PRODUCTOS MANUAL (EDITA AQUÍ CADA AUTO) 🚨
        // =================================================================================
        // Instrucciones:
        // 1. Pega tu archivo .glb en "backend/public/models/"
        // 2. Cambia 'model_url' por '/models/nombre-de-tu-archivo.glb'
        // 3. Cambia 'image_url' por el link de la foto de portada que quieras
        
        const products = [
            // --- AUTO 1 ---
            {
                name: '1957 Oldsmobile Starfire 98 Convertible',
                description: 'El Oldsmobile Starfire 98 Convertible de 1957 es un automóvil de lujo de tamaño completo con un motor V8 "Rocket" de 371 pulgadas cúbicas, transmisión automática Hydra-Matic y un diseño elegante con elementos cromados y aletas traseras icónicas',
                price: 200.000, 
                stock: 5, 
                category: 'Autos',
                image_url: 'https://cdnb.artstation.com/p/assets/images/images/001/233/693/large/barba-rossa-olds-01.jpg?1442686432', // FOTO PORTADA
                model_url: '/models/1957.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 2 ---
            {
                name: 'Porsche 911 GT3 RS',
                description: 'El rey de los track days. Alerón activo y jaula antivuelco.',
                price: 280.00, 
                stock: 8, 
                category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=800',
                model_url: '/models/porsche.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 3 ---
            {
                name: 'Lamborghini Aventador SVJ',
                description: 'V12 atmosférico puro. Agresividad total.',
                price: 520.00, 
                stock: 3, 
                category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800',
                model_url: '/models/lambo.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 4 ---
            {
                name: 'Nissan Skyline R34 GT-R',
                description: 'La leyenda de Japón. Midnight Purple.',
                price: 210.00, 
                stock: 10, 
                category: 'JDM',
                image_url: 'https://images.unsplash.com/photo-1600712242805-5f786716a5d7?w=800',
                model_url: '/models/gtr.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 5 ---
            {
                name: 'Ford Mustang Shelby GT500',
                description: 'El clásico americano "Eleanor".',
                price: 350.00, 
                stock: 4, 
                category: 'Clásicos',
                image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
                model_url: '/models/mustang.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 6 ---
            {
                name: 'McLaren P1',
                description: 'Hypercar británico híbrido.',
                price: 410.00, 
                stock: 2, 
                category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=800',
                model_url: '/models/mclaren.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 7 ---
            {
                name: 'Toyota Supra MK4',
                description: 'Motor 2JZ legendario.',
                price: 220.00, 
                stock: 15, 
                category: 'JDM',
                image_url: 'https://images.unsplash.com/photo-1605515298946-d062f2e9da53?w=800',
                model_url: '/models/supra.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 8 ---
            {
                name: 'Bugatti Chiron',
                description: 'El auto más rápido del mundo. Lujo extremo.',
                price: 600.00, 
                stock: 1, 
                category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1627454820574-fb6b3f77bb67?w=800',
                model_url: '/models/bugatti.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 9 ---
            {
                name: 'Honda NSX Type-R',
                description: 'Afinado por Ayrton Senna.',
                price: 250.00, 
                stock: 6, 
                category: 'JDM',
                image_url: 'https://images.unsplash.com/photo-1621995808206-882205608688?w=800',
                model_url: '/models/nsx.glb' // TU ARCHIVO GLB AQUÍ
            },

            // --- AUTO 10 ---
            {
                name: 'Chevrolet Corvette C8',
                description: 'Motor central americano.',
                price: 180.00, 
                stock: 12, 
                category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1619363063065-2d79043c942c?w=800',
                model_url: '/models/corvette.glb' // TU ARCHIVO GLB AQUÍ
            }

            // ... COPIA Y PEGA EL BLOQUE DE ARRIBA PARA AGREGAR MÁS AUTOS ...
        ];

        console.log(`🤖 Insertando ${products.length} productos manuales...`);
        
        for(const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [
                    p.name, 
                    p.description, 
                    p.price, 
                    p.stock, 
                    p.category, 
                    p.image_url,     
                    p.model_url    
                ]
            );
        }

        console.log('✅ ¡CARGA EXITOSA! TU GARAJE PERSONALIZADO ESTÁ LISTO.');
        console.log('👉 Asegúrate de que los archivos .glb existan en la carpeta "backend/public/models/" con esos nombres exactos.');

    } catch (error) {
        console.error('❌ ERROR FATAL:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

seedProducts();