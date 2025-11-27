const express = require('express');
const router = express.Router();
// Importamos el objeto completo del controlador
const productController = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validations');

// --- RUTAS PÚBLICAS (Catálogo) ---
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// --- RUTAS PRIVADAS (Admin) ---
// Usamos middlewares para proteger
router.post('/', protect, adminOnly, validateProduct, productController.createProduct);
router.put('/:id', protect, adminOnly, validateProduct, productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;