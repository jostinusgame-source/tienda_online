const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Construir la ruta exacta al archivo .env
const envPath = path.join(__dirname, '..', '.env');

// 2. Verificar si el archivo existe
if (!fs.existsSync(envPath)) {
    console.error(`\n❌ ERROR FATAL: No encuentro el archivo .env en: ${envPath}`);
    process.exit(1);
}

// 3. Cargar las variables
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("❌ Error leyendo el archivo .env:", result.error);
    process.exit(1);
}

console.log('\n📂 Archivo .env cargado.');

async function updateDatabase() {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.error('\n❌ DETENIDO: Faltan credenciales en el archivo .env.');
        return;
    }

    console.log('\n🔌 Conectando a la base de datos...');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ ¡Conexión exitosa! Iniciando creación de tablas...');

        // 1. TABLA USERS (Incluye phone y campos de verificación)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(80) NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                phone VARCHAR(20) NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin','customer') DEFAULT 'customer',
                email_verification_code VARCHAR(10) NULL,
                email_verification_expiration DATETIME NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                recovery_code VARCHAR(10) NULL,
                recovery_code_expiration DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   - Tabla "users" verificada/creada.');

        // 2. TABLA PRODUCTS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                stock INT DEFAULT 0,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   - Tabla "products" verificada/creada.');

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
        console.log('   - Tabla "orders" verificada/creada.');

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
        console.log('   - Tabla "order_items" verificada/creada.');

        // 5. ASEGURAR COLUMNA PHONE (Por si la tabla ya existía pero sin teléfono)
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN phone VARCHAR(20) NULL AFTER email;
            `);
            console.log('   - Columna "phone" agregada (actualización).');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('   - La columna "phone" ya estaba presente.');
            } else {
                console.warn('   - Nota:', err.message);
            }
        }

        console.log('\n✅ ¡BASE DE DATOS EN LA NUBE LISTA!');
        await connection.end();

    } catch (error) {
        console.error('❌ Error General:', error.message);
        console.error('   Código:', error.code);
    }
}

updateDatabase();