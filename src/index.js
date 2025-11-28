const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// IMPORTANTE: Importamos el archivo maestro de rutas que creamos antes
const apiRoutes = require('./routes/apiRoutes'); 

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// RUTAS (Aquí estaba el error 404, ahora usamos la ruta maestra)
app.use('/api', apiRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.send('SpeedCollect API Online 🏎️');
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});