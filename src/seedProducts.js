const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function seedProducts() {
    console.log('🔌 Conectando a la base de datos...');

    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        // ESTO ES CRUCIAL PARA RENDER:
        ssl: { rejectUnauthorized: false }
    };

    try {
        const connection = await mysql.createConnection(dbConfig);

        // 1. CREAR LA TABLA SI NO EXISTE (Esto faltaba)
        console.log('🛠️ Verificando estructura de tablas...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(12, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Limpiar tabla anterior (Opcional, descomenta si quieres limpiar todo antes de llenar)
        // await connection.execute('TRUNCATE TABLE products');

        // 3. Verificar si ya hay productos para no duplicar
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        if (rows[0].count > 0) {
            console.log('⚠️ La base de datos ya tiene productos. Saltando seed.');
            await connection.end();
            return;
        }

        const products = [
            {
                name: 'Ferrari LaFerrari Aperta',
                description: 'La máxima expresión híbrida de Maranello. Escala 1:18.',
                price: 1800000.00, // Precio en COP aprox
                stock: 5,
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=800'
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'El rey de los circuitos. Acabado en Lizard Green.',
                price: 1250000.00,
                stock: 12,
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800'
            },
            {
                name: 'Lamborghini Huracán Evo',
                description: 'V10 atmosférico. Pintura tricapa Arancio Xanto.',
                price: 1100000.00,
                stock: 8,
                image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800'
            },
            {
                name: 'Shelby Cobra 427 S/C',
                description: 'Clásico americano. Metal die-cast pesado.',
                price: 650000.00,
                stock: 3,
                image_url: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=800'
            }
        ];

        for (const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)',
                [p.name, p.description, p.price, p.stock, p.image_url]
            );
            console.log(`✅ Insertado: ${p.name}`);
        }

        console.log('🏁 ¡Catálogo actualizado con éxito!');
        await connection.end();

    } catch (error) {
        console.error('❌ Error fatal:', error);
    }
}

seedProducts();