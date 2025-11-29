const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes'); 

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// 🔥 ESTA LÍNEA ES LA CLAVE 🔥
// Como index.js está en 'src' y la carpeta 'public' TAMBIÉN está en 'src',
// usamos 'public' directo (sin ../)
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('SpeedCollect API Online 🏎️');
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error interno', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});