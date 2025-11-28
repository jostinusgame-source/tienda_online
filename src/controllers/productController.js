const Product = require('../models/Product');

// Función segura para obtener productos (con filtro opcional de categoría)
const getAllProducts = async (req, res) => {
    try {
        const category = req.query.category; // Soporte para ?category=Camisetas
        const products = await Product.findAll(category);
        res.status(200).json(products || []);
    } catch (error) {
        console.error("❌ ERROR EN GET PRODUCTS:", error);
        res.status(200).json([]); 
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando producto' });
    }
};

const createProduct = async (req, res) => {
    try {
        const id = await Product.create(req.body);
        res.status(201).json({ message: 'Producto creado', id });
    } catch (error) {
        res.status(500).json({ message: 'Error creando producto' });
    }
};

const updateProduct = async (req, res) => {
    // Nota: Es mejor usar el storeController para gestión masiva, 
    // pero mantenemos esto por si usas una API externa.
    try {
        // Necesitarías implementar Product.update en el modelo
        res.status(501).json({ message: 'Usa storeController para actualizar' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando' });
    }
};

const deleteProduct = async (req, res) => {
    try {
         // Necesitarías implementar Product.delete en el modelo
         res.status(501).json({ message: 'Usa storeController para eliminar' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando' });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};