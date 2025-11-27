const mysql = require('mysql2/promise');
const path = require('path');
// Ajustamos la ruta para asegurarnos de que encuentre el .env correctamente
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔌 Conectando a la base de datos (Sin SSL)...');

    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
        // ❌ HEMOS ELIMINADO LA LÍNEA DE SSL AQUÍ
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión exitosa.');

        // 1. Crear tabla
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

        // 2. Verificar si hay datos
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        
        if (rows[0].count > 0) {
            console.log('⚠️ La tabla ya tiene productos. No se insertará nada nuevo.');
        } else {
            console.log('🌱 Insertando colección de autos...');
            const products = [
                {
                    name: 'Ferrari LaFerrari Aperta',
                    description: 'La máxima expresión híbrida de Maranello. Escala 1:18.',
                    price: 1800000.00,
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
                console.log(` -> Insertado: ${p.name}`);
            }
        }

        console.log('🏁 ¡Proceso terminado!');
        await connection.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

seedProducts();