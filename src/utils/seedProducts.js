const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔌 Conectando DB...');
    
    // Configuración SIN SSL para evitar Handshake Error en Clever Cloud
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Asegurar que la tabla tenga la columna model_url
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(12, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                image_url VARCHAR(500),
                model_url VARCHAR(500), 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Limpiar para re-llenar (Opcional: puedes comentar esto si quieres mantener historial)
        await connection.execute('TRUNCATE TABLE products');

        const products = [
            {
                name: 'Ferrari LaFerrari',
                description: 'El primer híbrido de Maranello. 963 CV de pura furia italiana.',
                price: 4500000.00,
                stock: 3,
                image_url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=800',
                model_url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Ferrari/glTF/Ferrari.gltf' // Ejemplo GLTF oficial
            },
            {
                name: 'Porsche 911 GT3 RS',
                description: 'Ingeniería alemana de precisión para el circuito.',
                price: 2800000.00,
                stock: 8,
                image_url: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800',
                model_url: 'https://modelviewer.dev/shared-assets/models/Porsche911GT2.glb' // Placeholder similar
            },
            {
                name: 'Bugatti Chiron',
                description: 'El rey de la velocidad. 1500 CV y lujo extremo.',
                price: 12000000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1621503358327-05c21f82f2c2?auto=format&fit=crop&w=800',
                model_url: 'https://sketchfab.com/models/bugatti-chiron-draft/embed' // Nota: Sketchfab requiere iframe, usaremos glb genéricos para model-viewer
            },
            {
                name: 'Lamborghini Aventador SVJ',
                description: 'V12 atmosférico. Agresividad en estado puro.',
                price: 3500000.00,
                stock: 4,
                image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800',
                model_url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' // Placeholder
            },
            {
                name: 'Shelby Cobra 427',
                description: 'Clásico americano. Potencia bruta sin ayudas electrónicas.',
                price: 5500000.00,
                stock: 2,
                image_url: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'McLaren P1',
                description: 'Aerodinámica activa y tecnología de Fórmula 1.',
                price: 4200000.00,
                stock: 5,
                image_url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Aston Martin Valkyrie',
                description: 'Un F1 homologado para calle. Diseño de Adrian Newey.',
                price: 9000000.00,
                stock: 1,
                image_url: 'https://images.unsplash.com/photo-1605816988069-424a1b870636?auto=format&fit=crop&w=800',
                model_url: ''
            },
            {
                name: 'Koenigsegg Jesko',
                description: 'El megacar sueco capaz de romper la barrera de las 300 mph.',
                price: 11500000.00,
                stock: 2,
                image_url: 'https://images.unsplash.com/photo-1634547903823-389369c43d78?auto=format&fit=crop&w=800',
                model_url: ''
            }
        ];

        for (const p of products) {
            await connection.execute(
                'INSERT INTO products (name, description, price, stock, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?)',
                [p.name, p.description, p.price, p.stock, p.image_url, p.model_url || null]
            );
            console.log(`✅ ${p.name}`);
        }

        console.log('🏁 Catálogo reconstruido.');
        await connection.end();
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

seedProducts();