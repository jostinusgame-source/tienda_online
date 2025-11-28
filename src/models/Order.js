const pool = require('../config/database');

const Order = {
    // 1. Crear Orden (Encabezado)
    create: async (userId, total, paymentMethod) => {
        const query = 'INSERT INTO orders (user_id, total, payment_method, status) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(query, [userId, total, paymentMethod, 'pending']);
        return result.insertId;
    },

    // 2. Agregar items a la orden
    addItems: async (orderId, items) => {
        // Items es un array: [{ name, quantity, price }, ...]
        const query = 'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?';
        
        // Convertimos el array de objetos a un array de arrays para MySQL
        const values = items.map(item => [orderId, item.name, item.quantity, item.price]);
        
        await pool.query(query, [values]);
    },

    // 3. Buscar órdenes de un usuario (Para "Mis Compras")
    findByUser: async (email) => {
        // Buscamos por email para ser consistentes con storeController
        const query = `
            SELECT id, total, status, created_at, payment_method 
            FROM orders 
            WHERE user_email = ? 
            ORDER BY created_at DESC
        `;
        const [rows] = await pool.query(query, [email]);
        return rows;
    },

    // 4. Obtener detalles de una orden específica (Items)
    getOrderItems: async (orderId) => {
        const query = 'SELECT * FROM order_items WHERE order_id = ?';
        const [rows] = await pool.query(query, [orderId]);
        return rows;
    }
};

module.exports = Order;