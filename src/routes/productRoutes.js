const express = require('express');
const router = express.Router();
const { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validations');

// Rutas Públicas
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Rutas Privadas (Solo Admin)
router.post('/', protect, adminOnly, validateProduct, createProduct);
router.put('/:id', protect, adminOnly, validateProduct, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

// --- IMPORTANTE: Exportar el router ---
module.exports = router;