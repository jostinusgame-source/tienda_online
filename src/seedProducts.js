const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function seedProducts() {
    if (!process.env.DB_HOST) {
        console.error('❌ Error: No se encuentra el archivo .env');
        return;
    }

    console.log('🔌 Conectando para insertar autos...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        // Borramos productos viejos para no duplicar (Opcional)
        // await connection.query('DELETE FROM products');

        const products = [
            {
                name: 'Ferrari LaFerrari Aperta',
                description: 'La máxima expresión híbrida de Maranello. Escala 1:18, detalles en fibra de carbono real.',
                price: 450.00,
                stock: 5,
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'El rey de los circuitos. Acabado en Lizard Green, llantas de magnesio funcionales.',
                price: 320.50,
                stock: 12,
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            },
            {
                name: 'Lamborghini Huracán Evo',
                description: 'V10 atmosférico en tu estantería. Pintura tricapa Arancio Xanto.',
                price: 299.99,
                stock: 8,
                image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            },
            {
                name: 'Shelby Cobra 427 S/C',
                description: 'Clásico americano. Metal die-cast pesado, apertura de capó y motor detallado.',
                price: 180.00,
                stock: 3,
                image_url: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
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
        console.error('❌ Error:', error);
    }
}

seedProducts();