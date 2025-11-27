const Order = require('../models/Order');

// 1. Crear Orden
exports.createOrder = async (req, res) => {
    try {
        // items debe ser un array [{product_id, quantity, price}]
        const { items, total } = req.body; 
        const userId = req.user.id; // Viene del token

        const orderId = await Order.create(userId, total, items);
        
        res.status(201).json({ message: 'Orden creada exitosamente', orderId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al procesar la orden' });
    }
};

// 2. Ver mis órdenes
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.findByUser(req.user.id);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener órdenes' });
    }
};