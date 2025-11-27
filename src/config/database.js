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
    queueLimit: 0
});

// Verificar conexión al iniciar (opcional, solo para debug)
pool.getConnection()
    .then(connection => {
        pool.releaseConnection(connection);
        console.log('✅ Base de datos conectada exitosamente.');
    })
    .catch(err => {
        console.error('❌ Error conectando a la BD:', err);
    });

module.exports = pool;