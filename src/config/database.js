const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 👇 ESTO ES LO QUE TE FALTABA PARA QUE FUNCIONE EN RENDER 👇
    ssl: {
        rejectUnauthorized: false
    }
});

// Verificación de conexión mejorada
pool.getConnection()
    .then(connection => {
        pool.releaseConnection(connection);
        console.log('✅ Base de datos (Nube) conectada exitosamente.');
    })
    .catch(err => {
        console.error('❌ Error CRÍTICO conectando a la BD:', err.message);
        // Esto nos ayuda a ver si es error de contraseña o de SSL
        if(err.code === 'HANDSHAKE_SSL_ERROR') {
            console.error('⚠️ El error es por falta de certificados SSL (Ya debería estar arreglado con este código).');
        }
    });

module.exports = pool;