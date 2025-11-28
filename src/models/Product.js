const pool = require('../config/database');

const Product = {
    // 1. Obtener todos los productos (Opcional: filtrar por categoría)
    findAll: async (category) => {
        try {
            let query = 'SELECT * FROM products';
            let params = [];

            if (category) {
                query += ' WHERE category = ?';
                params.push(category);
            }

            const [rows] = await pool.query(query, params);
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

    // 3. Crear producto (Actualizado con Categoría)
    create: async (data) => {
        const { name, description, price, stock, category, image_url } = data;
        
        // Si no mandan categoría, ponemos 'General'
        const cat = category || 'General'; 

        const [result] = await pool.query(
            'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, cat, image_url]
        );
        return result.insertId;
    },

    // 4. Actualizar Stock (Útil para cuando hagan compras)
    updateStock: async (id, quantity) => {
        const [result] = await pool.query(
            'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
            [quantity, id, quantity]
        );
        return result.affectedRows > 0;
    }
};

module.exports = Product;