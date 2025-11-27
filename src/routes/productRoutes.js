const express = require('express');
const router = express.Router();

// Importamos las funciones DEL ARCHIVO QUE ACABAMOS DE ARREGLAR
const { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} = require('../controllers/productController');

// Importamos middlewares
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validations');

// --- Definir Rutas ---

// Públicas (Cualquiera puede ver)
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Privadas (Solo Admin puede editar/borrar)
// Nota: Si validateProduct es undefined, asegúrate de haber actualizado validations.js como hicimos antes
router.post('/', protect, adminOnly, validateProduct, createProduct);
router.put('/:id', protect, adminOnly, validateProduct, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;