const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Configuración de entorno
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error(`\n❌ ERROR: No encuentro el archivo .env en: ${envPath}`);
    process.exit(1);
}
dotenv.config({ path: envPath });

async function updateDatabase() {
    console.log('\n🔌 Conectando a la base de datos...');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ Conexión exitosa. Actualizando estructura...');

        // 1. TABLA USERS (Simplificada: Sin verificación de correo)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(80) NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                phone VARCHAR(20) NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin','customer') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   - Tabla "users" lista (Sin códigos de verificación).');

        // 2. TABLA PRODUCTS (Con Categoría para Camisetas/Raros)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL, -- Precios en USD
                stock INT DEFAULT 0,
                category VARCHAR(50) DEFAULT 'Autos', -- Nueva columna para filtros
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Intentamos agregar la columna category si la tabla ya existía
        try {
            await connection.query(`ALTER TABLE products ADD COLUMN category VARCHAR(50) DEFAULT 'Autos'`);
            console.log('   - Columna "category" agregada a productos.');
        } catch (e) { /* Ignorar si ya existe */ }
        
        console.log('   - Tabla "products" lista.');

        // 3. TABLA ORDERS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                total DECIMAL(10,2),
                status ENUM('pending','paid','shipped','cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('   - Tabla "orders" lista.');

        // 4. TABLA ORDER_ITEMS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                product_id INT,
                quantity INT,
                price DECIMAL(10,2),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);
        console.log('   - Tabla "order_items" lista.');

        // 5. NUEVA TABLA: REVIEWS (Reseñas)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                rating INT NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);
        console.log('   - Tabla "reviews" creada exitosamente.');

        console.log('\n✅ BASE DE DATOS ACTUALIZADA CORRECTAMENTE');
        await connection.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updateDatabase();