console.log("🟡 [INICIO] Iniciando diagnóstico del servidor...");

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// --- CARGA Y DIAGNÓSTICO DE RUTAS ---
function checkRoute(name, route) {
    const type = typeof route;
    console.log(`🔎 Verificando ${name}... Tipo: ${type}`);
    if (type !== 'function') {
        console.error(`🔴 ¡ALERTA! ${name} ESTÁ ROTO. Es un objeto vacío ({}) en lugar de una función.`);
        console.error(`   👉 Revisa el archivo routes/${name}.js y asegúrate de que tenga 'module.exports = router;'`);
        return false;
    }
    console.log(`✅ ${name} está perfecto.`);
    return true;
}

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Verificamos TODAS antes de usarlas
const authOk = checkRoute('authRoutes', authRoutes);
const prodOk = checkRoute('productRoutes', productRoutes);
const orderOk = checkRoute('orderRoutes', orderRoutes);
const aiOk = checkRoute('aiRoutes', aiRoutes);

if (!authOk || !prodOk || !orderOk || !aiOk) {
    console.error("🔥 DETENIENDO SERVIDOR PORQUE UNA RUTA ESTÁ ROTA.");
    process.exit(1); // Detenemos aquí para que veas el error claro en los logs
}

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
console.log("🚀 Cargando rutas en Express...");
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes); // Posible culpable
app.use('/api/orders', orderRoutes);
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