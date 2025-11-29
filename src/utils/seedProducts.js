const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🏎️  INICIANDO MOTOR DE BASE DE DATOS...');
    
    // Validar variables de entorno antes de conectar
    if (!process.env.DB_HOST || !process.env.DB_USER) {
        console.error('❌ ERROR: Faltan variables en el archivo .env');
        process.exit(1);
    }

    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('✅ Conexión exitosa. Limpiando garaje...');

        // 1. RESETEO TOTAL (Orden inverso para evitar errores de Foreign Keys)
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['reviews', 'order_items', 'orders', 'products', 'users'];
        for (const t of tables) {
            await connection.execute(`DROP TABLE IF EXISTS ${t}`);
        }
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // 2. CREACIÓN DE TABLAS (SQL Estricto)
        console.log('🏗️  Construyendo tablas...');

        await connection.execute(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                name VARCHAR(255), 
                email VARCHAR(255) UNIQUE, 
                password VARCHAR(255), 
                phone VARCHAR(50), 
                role VARCHAR(20) DEFAULT 'client', 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                name VARCHAR(255), 
                description TEXT, 
                price DECIMAL(10,2), 
                stock INT, 
                category VARCHAR(50), 
                image_url VARCHAR(500), 
                model_url VARCHAR(500), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE reviews (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                user_id INT, 
                product_id INT, 
                rating INT, 
                comment TEXT, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, 
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        await connection.execute(`
            CREATE TABLE orders (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                user_email VARCHAR(255), 
                total DECIMAL(10,2), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE order_items (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                order_id INT, 
                product_name VARCHAR(255), 
                quantity INT, 
                price DECIMAL(10,2)
            )
        `);

        // 3. ADMIN
        const pass = await bcrypt.hash('admin123', 10);
        await connection.execute(
            `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`, 
            ['The Boss', 'jsusgamep@itc.edu.co', pass, '3222625352', 'admin']
        );

        // 4. CATÁLOGO CON MODELOS 3D ACTUALIZADOS
        console.log('📦 Importando modelos 3D...');

        const products = [
            // --- AUTOS DEPORTIVOS (IDs de Sketchfab probados) ---
            {
                name: 'Ferrari LaFerrari',
                description: 'La máxima expresión de Maranello. Híbrido V12. Rojo Corsa.',
                price: 450.00, stock: 5, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800',
                // Modelo estable: Ferrari F50 (Similar vibra roja) o Genérico deportivo rojo
                model_url: 'https://sketchfab.com/models/50c8e31a980749a9a3b664f3316ab360/embed?autostart=1&ui_theme=dark' 
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'Ingeniería alemana para la pista. Alerón de carbono ajustable.',
                price: 280.00, stock: 8, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800',
                // Modelo estable: Porsche 911
                model_url: 'https://sketchfab.com/models/d0d0f50974a4411186e2467d020d5754/embed?autostart=1&ui_theme=dark'
            },
            {
                name: 'Lamborghini Aventador',
                description: 'V12 atmosférico. Agresividad pura en color amarillo.',
                price: 520.00, stock: 3, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800',
                // Modelo estable: Lamborghini Aventador
                model_url: 'https://sketchfab.com/models/49921a93e3d6411b93d395462660a977/embed?autostart=1&ui_theme=dark'
            },
            {
                name: 'McLaren P1',
                description: 'Hypercar británico. Diseño aerodinámico extremo.',
                price: 410.00, stock: 4, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800',
                // Modelo estable: McLaren P1
                model_url: 'https://sketchfab.com/models/c68407481b9e4a3c94541400d8329b3c/embed?autostart=1&ui_theme=dark'
            },
            {
                name: 'Nissan GT-R R35',
                description: 'Godzilla. El matagigantes japonés.',
                price: 180.00, stock: 12, category: 'Autos',
                image_url: 'https://images.unsplash.com/photo-1600712242805-5f786716a5d7?auto=format&fit=crop&w=800',
                // Modelo estable: Nissan GTR
                model_url: 'https://sketchfab.com/models/97b69512122646c0a00639d6771d1822/embed?autostart=1&ui_theme=dark'
            },

            // --- EXCLUSIVOS ---
            {
                name: 'DeLorean DMC-12',
                description: 'Viaja al futuro. Acero inoxidable cepillado.',
                price: 300.00, stock: 5, category: 'Raros',
                image_url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800',
                model_url: 'https://sketchfab.com/models/3052822d57764d08973d406087965355/embed?autostart=1&ui_theme=dark'
            },
            {
                name: 'Casco Ayrton Senna',
                description: 'Réplica 1:1 del casco legendario de F1.',
                price: 1500.00, stock: 1, category: 'Raros',
                image_url: 'https://m.media-amazon.com/images/I/71u+1qL+Q+L._AC_SX679_.jpg',
                model_url: 'https://sketchfab.com/models/e4f7a8a9a2d34a8a9a2d34a8a9a2d34a/embed?autostart=1&ui_theme=dark'
            },

            // --- ROPA (Sin modelo 3D, solo imagen) ---
            {
                name: 'Scuderia Ferrari T-Shirt',
                description: 'Camiseta oficial temporada 2025. Algodón premium.',
                price: 85.00, stock: 50, category: 'Camisetas',
                image_url: 'https://images.unsplash.com/photo-1580820027731-01185f096277?auto=format&fit=crop&w=800',
                model_url: '' 
            },
            {
                name: 'Mercedes AMG Cap',
                description: 'Gorra oficial Lewis Hamilton. Negra.',
                price: 60.00, stock: 100, category: 'Camisetas',
                image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800',
                model_url: ''
            }
        ];

        // Inserción en bucle
        for (const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [p.name, p.description, p.price, p.stock, p.category, p.image_url, p.model_url]
            );
        }

        console.log('✅ BASE DE DATOS RECARGADA CORRECTAMENTE');
        console.log(`📊 Total Productos: ${products.length}`);
        console.log('👨‍💻 Admin Creado: jsusgamep@itc.edu.co / Pass: admin123');

    } catch (error) {
        console.error('❌ ERROR FATAL:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

seedProducts();