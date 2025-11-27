const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Importar Rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const aiRoutes = require('./routes/aiRoutes'); // <--- NUEVA RUTA

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static('src/public'));

// Definir Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes); // <--- ACTIVAR RUTA IA

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'SpeedCollect API con Gemini AI Online 🚀' });
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