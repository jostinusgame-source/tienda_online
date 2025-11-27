const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController'); // Importamos todo el objeto
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validations');

// Depuración: Si esto imprime undefined, el servidor se detendrá antes de explotar
if (!productController.getAllProducts) {
    console.error("🔴 ERROR FATAL: productController no está cargando las funciones.");
}

// Rutas Públicas
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Rutas Admin
router.post('/', protect, adminOnly, validateProduct, productController.createProduct);
router.put('/:id', protect, adminOnly, validateProduct, productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;