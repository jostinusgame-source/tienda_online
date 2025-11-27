const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Importar Rutas
const authRoutes = require('./routes/authRoutes');
// const productRoutes = require('./routes/productRoutes'); // <--- Aún comentado
// const orderRoutes = require('./routes/orderRoutes');     // <--- Aún comentado

const app = express();

// Middlewares
app.use(express.json()); 
app.use(cors());         
app.use(morgan('dev')); 
app.use(express.static('src/public')); 

// Rutas
app.use('/api/auth', authRoutes);         // <--- ACTIVO
// app.use('/api/products', productRoutes); // <--- Aún comentado
// app.use('/api/orders', orderRoutes);     // <--- Aún comentado

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de Tienda Online' });
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