const pool = require('../config/database');

// 1. VER EL CATÁLOGO (Público)
const getProducts = async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products');
        res.json(products);
    } catch (e) { 
        res.status(500).json({message: 'Error al obtener productos'}); 
    }
};

// 2. AGREGAR AL CARRITO (Con Reserva de Stock)
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id; // Viene del token

    try {
        // A. Verificar stock DISPONIBLE (Stock total - Reservas activas de otros)
        const [productRows] = await pool.query(`
            SELECT p.stock, 
            (SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE product_id = p.id AND status = 'active' AND expires_at > NOW()) as reserved
            FROM products p WHERE p.id = ?`, [productId]);

        if (productRows.length === 0) return res.status(404).json({ message: 'Auto no encontrado.' });

        const { stock, reserved } = productRows[0];
        const available = stock - reserved;

        if (available < quantity) {
            return res.status(400).json({ message: `¡Lo sentimos! Solo quedan ${available} unidades disponibles.` });
        }

        // B. Crear Reserva (Válida por 30 minutos)
        const expiresAt = new Date(Date.now() + 30 * 60000); // Ahora + 30 min
        
        // Verificar si ya tiene reserva de este producto para actualizarla o crear nueva
        await pool.query(
            `INSERT INTO reservations (user_id, product_id, quantity, expires_at, status) VALUES (?, ?, ?, ?, 'active')`,
            [userId, productId, quantity, expiresAt]
        );

        res.status(200).json({ message: 'Auto reservado en tu garaje por 30 min.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al reservar producto.' });
    }
};

// 3. OBTENER CARRITO (Desde DB)
const getCart = async (req, res) => {
    const userId = req.user.id;
    try {
        const [cartItems] = await pool.query(`
            SELECT r.id as reservation_id, r.quantity, p.id, p.name, p.price, p.image_url 
            FROM reservations r
            JOIN products p ON r.product_id = p.id
            WHERE r.user_id = ? AND r.status = 'active' AND r.expires_at > NOW()
        `, [userId]);

        // Calcular total
        const total = cartItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);

        res.json({ items: cartItems, total });
    } catch (error) {
        res.status(500).json({ message: 'Error cargando carrito' });
    }
};

// 4. CHECKOUT ATÓMICO (Compra Real)
const checkout = async (req, res) => {
    const userId = req.user.id;
    const connection = await pool.getConnection(); // Usamos conexión para transacción

    try {
        await connection.beginTransaction();

        // A. Obtener reservas activas
        const [reservations] = await connection.query(`
            SELECT r.*, p.name, p.price, p.stock 
            FROM reservations r
            JOIN products p ON r.product_id = p.id
            WHERE r.user_id = ? AND r.status = 'active' AND r.expires_at > NOW()
            FOR UPDATE
        `, [userId]);

        if (reservations.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tu carrito expiró o está vacío.' });
        }

        let total = 0;
        
        // B. Crear Orden
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_email, total) VALUES ((SELECT email FROM users WHERE id = ?), 0)',
            [userId]
        );
        const orderId = orderResult.insertId;

        // C. Procesar cada item
        for (const item of reservations) {
            // Verificar stock físico final por seguridad
            if (item.stock < item.quantity) throw new Error(`Stock insuficiente para ${item.name}`);

            // Descontar stock real
            await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
            
            // Marcar reserva como comprada
            await connection.query('UPDATE reservations SET status = "purchased" WHERE id = ?', [item.id]);

            // Agregar a items de orden
            await connection.query(
                'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.name, item.quantity, item.price]
            );

            total += parseFloat(item.price) * item.quantity;
        }

        // Actualizar total de la orden
        await connection.query('UPDATE orders SET total = ? WHERE id = ?', [total, orderId]);

        await connection.commit();
        res.json({ success: true, message: 'Compra exitosa', orderId, total });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message || 'Error en el pago' });
    } finally {
        connection.release();
    }
};

module.exports = { getProducts, addToCart, getCart, checkout };