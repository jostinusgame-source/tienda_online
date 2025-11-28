const pool = require('../config/database');

// 1. Crear Orden (Redirigimos al storeController para mantener la lógica de Stock)
exports.createOrder = async (req, res) => {
    // Recomendamos usar storeController.createOrder porque maneja transacciones
    res.status(307).redirect('/api/store/order'); 
};

// 2. Ver mis órdenes (Historial del Usuario)
exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id; // Viene del token JWT
        // Buscamos las órdenes por el email del usuario (así lo guardamos en storeController)
        const userEmail = req.user.email; 

        const query = `
            SELECT id, total, status, created_at, payment_method 
            FROM orders 
            WHERE user_email = ? 
            ORDER BY created_at DESC
        `;
        
        const [orders] = await pool.query(query, [userEmail]);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener tus órdenes' });
    }
};