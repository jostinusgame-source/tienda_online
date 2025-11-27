const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// --- IMPORTAR RUTAS ---
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const aiRoutes = require('./routes/aiRoutes'); // <--- ¡AQUÍ CONECTAMOS A ENZO!

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// --- SERVIR FRONTEND (Página Web) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- DEFINIR RUTAS DE LA API ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes); // <--- ¡AQUÍ ACTIVAMOS LA RUTA!

// Ruta de prueba
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