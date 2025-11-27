const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Busca el .env en la carpeta anterior

async function updateDatabase() {
    console.log('🔌 Conectando a la base de datos en la nube...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    console.log('✅ Conexión exitosa.');

    try {
        // 1. Agregar columna de teléfono si no existe
        console.log('📱 Agregando columna de teléfono...');
        await connection.query(`
            ALTER TABLE users 
            ADD COLUMN phone VARCHAR(20) NULL AFTER email;
        `);
        console.log('✅ Columna "phone" agregada correctamente.');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ La columna "phone" ya existía. No se hicieron cambios.');
        } else {
            console.error('❌ Error actualizando tabla:', error);
        }
    } finally {
        await connection.end();
        console.log('👋 Conexión cerrada.');
    }
}

updateDatabase();