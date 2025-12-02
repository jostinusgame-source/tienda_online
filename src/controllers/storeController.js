const pool = require('../config/database');

// 1. CATÁLOGO (Paginado)
const getProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        // Filtros
        if (category && category !== 'all') { query += " AND category = ?"; params.push(category); }
        if (maxPrice) { query += " AND price <= ?"; params.push(maxPrice); }
        
        if (initial) {
            query += " AND name LIKE ?"; params.push(`${initial}%`);
        } else if (search) {
            query += " AND LOWER(name) LIKE ?"; params.push(`%${search.toLowerCase()}%`);
        }

        // Paginación (Importante para el botón Cargar Más)
        const l = parseInt(limit) || 10;
        const o = parseInt(offset) || 0;
        query += " LIMIT ? OFFSET ?";
        params.push(l, o);

        const [products] = await pool.query(query, params);
        
        // Verificar Venta Nocturna
        const [promos] = await pool.query('SELECT * FROM promotions WHERE name="Venta Nocturna" AND is_active=1');
        const isNightSale = promos.length > 0;

        const processed = products.map(p => {
            if (isNightSale) {
                p.price = (p.base_price * 0.80).toFixed(2);
                p.discount = true;
            }
            return p;
        });

        res.json(processed);
    } catch (e) {
        res.status(500).json({ message: 'Error cargando catálogo' });
    }
};

// 2. AGREGAR AL CARRITO (RESERVAR)
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    try {
        // Stock disponible = Stock Total - Reservas Activas
        const [rows] = await pool.query(`
            SELECT p.stock, p.name, 
            (SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE product_id = p.id AND status = 'active' AND expires_at > NOW()) as reserved
            FROM products p WHERE p.id = ?`, [productId]);

        if (rows.length === 0) return res.status(404).json({ message: 'Producto no existe.' });
        
        const { stock, reserved, name } = rows[0];
        const available = stock - reserved;

        if (available < quantity) {
            return res.status(409).json({ message: `Stock insuficiente para ${name}. Quedan ${available} disponibles.` });
        }

        // Crear Reserva (30 min)
        const expires = new Date(Date.now() + 30 * 60000);
        await pool.query('INSERT INTO reservations (user_id, product_id, quantity, expires_at) VALUES (?, ?, ?, ?)', [userId, productId, quantity, expires]);

        res.json({ message: 'Producto reservado por 30 min.' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error al procesar reserva.' });
    }
};

// 3. VER CARRITO
const getCart = async (req, res) => {
    const userId = req.user.id;
    try {
        const [items] = await pool.query(`
            SELECT r.quantity, p.name, p.price, p.image_url 
            FROM reservations r JOIN products p ON r.product_id = p.id 
            WHERE r.user_id = ? AND r.status = 'active' AND r.expires_at > NOW()
        `, [userId]);
        
        const total = items.reduce((acc, i) => acc + (parseFloat(i.price) * i.quantity), 0);
        res.json({ items, total });
    } catch (e) { res.status(500).json({ message: 'Error carrito' }); }
};

// 4. CHECKOUT (Finalizar Compra)
const checkout = async (req, res) => {
    const userId = req.user.id;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Obtener reservas
        const [reservations] = await connection.query(`
            SELECT r.*, p.price, p.stock, p.name FROM reservations r 
            JOIN products p ON r.product_id = p.id 
            WHERE r.user_id = ? AND r.status = 'active' FOR UPDATE`, [userId]);

        if (reservations.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Carrito vacío o expirado.' });
        }

        let total = 0;
        const [order] = await connection.query('INSERT INTO orders (user_email, total) VALUES (?, 0)', [req.user.email]);
        
        for (const item of reservations) {
            // Validar stock final
            if (item.stock < item.quantity) throw new Error(`Stock insuficiente: ${item.name}`);
            
            // Descontar stock permanentemente
            await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
            // Marcar reserva usada
            await connection.query('UPDATE reservations SET status = "purchased" WHERE id = ?', [item.id]);
            // Guardar item
            await connection.query('INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)', 
                [order.insertId, item.name, item.quantity, item.price]);
            
            total += parseFloat(item.price) * item.quantity;
        }

        await connection.query('UPDATE orders SET total = ? WHERE id = ?', [total, order.insertId]);
        await connection.commit();
        
        res.json({ success: true, message: 'Compra finalizada', orderId: order.insertId, total });

    } catch (e) {
        await connection.rollback();
        res.status(500).json({ message: e.message || 'Error en pago' });
    } finally { connection.release(); }
};

const toggleNightSale = async (req, res) => { /* ... código existente ... */ };

module.exports = { getProducts, addToCart, getCart, checkout, toggleNightSale };