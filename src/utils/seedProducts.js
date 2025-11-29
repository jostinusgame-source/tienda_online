const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
    console.log('🔧 CARGANDO TUS AUTOS DESCARGADOS...');
    
    // Conexión
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    // 1. Limpieza rápida
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE products'); // Solo borra productos, mantiene usuarios
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // -----------------------------------------------------------------------
    // 📝 TU LISTA DE AUTOS (EDITA AQUÍ)
    // -----------------------------------------------------------------------
    // INSTRUCCIONES:
    // 1. 'image_url': Pon el link de internet de la foto de portada.
    // 2. 'model_url': Pon '/autos/NOMBRE_DEL_ARCHIVO.glb' (si lo metiste en src/public/autos)
    
    const misAutos = [
        {
            name: 'Chevrolet Corvette 1957',
            description: 'Clásico americano. Convertible. Color rojo.',
            price: 350.00,
            stock: 5,
            category: 'Clásicos',
            image_url: '[https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800](https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800)', // Foto portada
            model_url: '/autos/1957.glb' // 👈 AQUÍ VA EL NOMBRE EXACTO DE TU ARCHIVO EN PUBLIC
        },
        // Copia este bloque para agregar otro auto:
        {
            name: 'Ford Mustang GT',
            description: 'Muscle car moderno.',
            price: 280.00,
            stock: 10,
            category: 'Autos',
            image_url: '[https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800](https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800)',
            model_url: '' // Si no tienes el 3D todavía, déjalo vacío
        }
    ];

    // Inserción
    console.log(`📦 Insertando ${misAutos.length} autos...`);
    
    for (const auto of misAutos) {
        await connection.execute(
            'INSERT INTO products (name, description, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [
                auto.name, 
                auto.description, 
                auto.price, 
                auto.stock, 
                auto.category, 
                auto.image_url,     
                auto.model_url    
            ]
        );
    }

    console.log('✅ ¡AUTOS CARGADOS! Reinicia el servidor y prueba.');
    process.exit();
}

seedProducts();