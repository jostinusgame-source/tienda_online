const Product = require('../models/Product');

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();
        // Si no hay productos, devolvemos array vacío para que el frontend no falle
        res.json(products || []);
    } catch (error) {
        console.error("Error obteniendo productos:", error);
        // IMPORTANTE: Devolvemos un array vacío (200 OK) en lugar de error 500
        // para que la página cargue aunque la BD falle.
        res.status(200).json([]);
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Auto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando auto' });
    }
};

const createProduct = async (req, res) => {
    try {
        const id = await Product.create(req.body);
        res.status(201).json({ message: 'Producto creado', id });
    } catch (error) {
        res.status(500).json({ message: 'Error creando' });
    }
};

const updateProduct = async (req, res) => {
    try {
        await Product.update(req.params.id, req.body);
        res.json({ message: 'Actualizado' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        await Product.delete(req.params.id);
        res.json({ message: 'Eliminado' });
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