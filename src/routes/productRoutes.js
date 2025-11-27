const express = require('express');
const router = express.Router();

// Importar controladores (Asegúrate que productController.js tenga estas funciones exportadas)
const { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} = require('../controllers/productController');

// Importar middlewares
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validations');

// --- Definir Rutas ---

// Públicas
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Privadas (Solo Admin)
// Nota: Si alguna variable (como validateProduct) no existe, fallará. 
// Asegúrate de que validations.js exporte validateProduct.
router.post('/', protect, adminOnly, validateProduct, createProduct);
router.put('/:id', protect, adminOnly, validateProduct, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;