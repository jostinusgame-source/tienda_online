// Importamos la conexión que ya arreglamos en config/database.js
const pool = require('../config/database');

const Product = {
    // 1. Obtener todos los productos (Esta es la que te está fallando)
    findAll: async () => {
        try {
            // Hacemos la consulta SQL directa
            const [rows] = await pool.query('SELECT * FROM products');
            return rows;
        } catch (error) {
            console.error('Error en Product.findAll:', error);
            throw error;
        }
    },

    // 2. Obtener un producto por ID
    findById: async (id) => {
        try {
            const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            console.error('Error en Product.findById:', error);
            throw error;
        }
    },

    // 3. Crear producto (Opcional, para futuro uso)
    create: async (data) => {
        const { name, description, price, stock, image_url } = data;
        const [result] = await pool.query(
            'INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, stock, image_url]
        );
        return result.insertId;
    }
};

module.exports = Product;