console.log("🟡 [INICIO] Arrancando servidor...");

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Importar rutas con logs de verificación
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

console.log("🟡 [INICIO] Intentando requerir aiRoutes...");
const aiRoutes = require('./routes/aiRoutes');
console.log("🟡 [INICIO] aiRoutes cargado. Tipo de dato:", typeof aiRoutes);

// --- DETECTOR DE ERROR ---
// Si esto imprime "object" y no "function", ahí está el problema.
if (typeof aiRoutes !== 'function') {
    console.error("🔴 [ERROR FATAL] aiRoutes no es una función (Router). Es:", aiRoutes);
    console.error("   Esto significa que module.exports no funcionó en aiRoutes.js");
}

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Aquí es donde explota si aiRoutes está mal
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
    res.send('SpeedCollect API v1.0 - Online 🏎️');
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});