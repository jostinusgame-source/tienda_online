const pool = require('../config/database');

// 1. CATÁLOGO (CON PRECIOS DINÁMICOS Y BÚSQUEDA)
const getProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (category && category !== 'all') { query += " AND category = ?"; params.push(category); }
        if (maxPrice) { query += " AND price <= ?"; params.push(maxPrice); }
        
        if (initial) {
            query += " AND name LIKE ?"; params.push(`${initial}%`);
        } else if (search) {
            query += " AND LOWER(name) LIKE ?"; params.push(`%${search.toLowerCase()}%`);
        }

        const l = parseInt(limit) || 10;
        const o = parseInt(offset) || 0;
        query += " LIMIT ? OFFSET ?";
        params.push(l, o);

        const [products] = await pool.query(query, params);
        
        // Revisar Venta Nocturna
        const [promos] = await pool.query('SELECT * FROM promotions WHERE name="Venta Nocturna" AND is_active=1');
        const isNightSale = promos.length > 0;

        const processed = products.map(p => {
            if (isNightSale) {
                // Cálculo de precio en backend
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

// 2. AGREGAR (RESERVAR STOCK)
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    try {
        // Stock disponible = Stock Físico - Reservas Activas
        const [rows] = await pool.query(`
            SELECT p.stock, 
            (SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE product_id = p.id AND status = 'active' AND expires_at > NOW()) as reserved
            FROM products p WHERE p.id = ?`, [productId]);

        if (rows.length === 0) return res.status(404).json({ message: 'No existe' });
        
        const available = rows[0].stock - rows[0].reserved;

        if (available < quantity) {
            return res.status(400).json({ message: `Stock insuficiente. Quedan ${available}.` });
        }

        // Crear Reserva 30 min
        const expires = new Date(Date.now() + 30 * 60000);
        await pool.query('INSERT INTO reservations (user_id, product_id, quantity, expires_at) VALUES (?, ?, ?, ?)', [userId, productId, quantity, expires]);

        res.json({ message: 'Agregado al garaje (Reservado 30min).' });
    } catch (e) {
        res.status(500).json({ message: 'Error al reservar.' });
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
        
        const total = items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        res.json({ items, total });
    } catch (e) { res.status(500).json({ message: 'Error carrito' }); }
};

// 4. CHECKOUT
const checkout = async (req, res) => {
    const userId = req.user.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [reservations] = await connection.query(`
            SELECT r.*, p.name, p.price, p.stock FROM reservations r
            JOIN products p ON r.product_id = p.id
            WHERE r.user_id = ? AND r.status = 'active' AND r.expires_at > NOW() FOR UPDATE`, [userId]);

        if (reservations.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Carrito vacío o expirado.' });
        }

        let total = 0;
        const [orderRes] = await connection.query('INSERT INTO orders (user_email, total) VALUES (?, 0)', [req.user.email]);
        const orderId = orderRes.insertId;

        for (const item of reservations) {
            if (item.stock < item.quantity) throw new Error(`Stock insuficiente: ${item.name}`);
            
            await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
            await connection.query('UPDATE reservations SET status = "purchased" WHERE id = ?', [item.id]);
            await connection.query('INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.name, item.quantity, item.price]);
            
            total += parseFloat(item.price) * item.quantity;
        }

        await connection.query('UPDATE orders SET total = ? WHERE id = ?', [total, orderId]);
        await connection.commit();
        res.json({ success: true, message: 'Compra exitosa', orderId, total });

    } catch (e) {
        await connection.rollback();
        res.status(500).json({ message: e.message || 'Error en pago' });
    } finally { connection.release(); }
};

const toggleNightSale = async (req, res) => {
    const { active } = req.body;
    await pool.query('UPDATE promotions SET is_active = ? WHERE name = "Venta Nocturna"', [active ? 1 : 0]);
    // Actualizar precio visual en DB
    if(active) await pool.query('UPDATE products SET price = base_price * 0.80');
    else await pool.query('UPDATE products SET price = base_price');
    res.json({ success: true });
};

module.exports = { getProducts, addToCart, getCart, checkout, toggleNightSale };