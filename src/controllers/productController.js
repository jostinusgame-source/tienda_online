const Product = require('../models/Product');

// Definimos las funciones primero
const getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();
        // Si no hay productos, devolvemos array vacío pero NO error
        res.json(products || []);
    } catch (error) {
        console.error("Error en getAllProducts:", error);
        res.status(500).json({ message: 'Error al obtener el catálogo' });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Auto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando el auto' });
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

// Exportación como objeto único (Más seguro contra errores)
module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};