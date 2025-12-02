const pool = require('../config/database');

// 1. CATÁLOGO (CORREGIDO PARA PAGINACIÓN PERFECTA)
const getProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        
        // Construcción segura de la consulta
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        // Filtros
        if (category && category !== 'all') { 
            query += " AND category = ?"; 
            params.push(category); 
        }
        
        // Filtro de Precio
        if (maxPrice) { 
            query += " AND price <= ?"; 
            params.push(parseFloat(maxPrice)); 
        }
        
        // Búsqueda
        if (initial) {
            query += " AND name LIKE ?"; 
            params.push(`${initial}%`); 
        } else if (search) {
            query += " AND LOWER(name) LIKE ?"; 
            params.push(`%${search.toLowerCase()}%`); 
        }

        // Ordenamiento por defecto (Nuevos primero)
        query += " ORDER BY id DESC";

        // Paginación ESTRICTA (Convertir a Enteros)
        const limitVal = parseInt(limit, 10) || 10; 
        const offsetVal = parseInt(offset, 10) || 0;
        
        query += " LIMIT ? OFFSET ?";
        params.push(limitVal, offsetVal);

        // Ejecutar
        const [products] = await pool.query(query, params);
        
        // Verificar Venta Nocturna
        const [promos] = await pool.query('SELECT * FROM promotions WHERE name="Venta Nocturna" AND is_active=1');
        const isNightSale = promos.length > 0;

        const processed = products.map(p => {
            // Asegurar que los números sean números
            p.price = parseFloat(p.price);
            p.base_price = parseFloat(p.base_price || p.price);

            if (isNightSale) {
                p.price = (p.base_price * 0.80).toFixed(2);
                p.discount = true;
            }
            return p;
        });

        res.json(processed);

    } catch (e) {
        console.error("Error en getProducts:", e);
        res.status(500).json({ message: 'Error interno del catálogo' });
    }
};

// 2. CARRITO (RESERVA DE STOCK)
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    try {
        const [rows] = await pool.query(`
            SELECT p.stock, 
            (SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE product_id = p.id AND status = 'active' AND expires_at > NOW()) as reserved
            FROM products p WHERE p.id = ?`, [productId]);

        if (rows.length === 0) return res.status(404).json({ message: 'Producto no existe.' });
        
        const { stock, reserved } = rows[0];
        const available = stock - reserved;

        if (available < quantity) {
            return res.status(400).json({ message: `Stock insuficiente. Quedan ${available}.` });
        }

        // Reserva de 30 minutos
        const expires = new Date(Date.now() + 30 * 60000);
        await pool.query('INSERT INTO reservations (user_id, product_id, quantity, expires_at) VALUES (?, ?, ?, ?)', [userId, productId, quantity, expires]);

        res.json({ message: 'Producto reservado.' });

    } catch (e) {
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

// 4. CHECKOUT (PAGO)
const checkout = async (req, res) => {
    const userId = req.user.id;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const [reservations] = await connection.query(`
            SELECT r.*, p.price, p.stock, p.name FROM reservations r 
            JOIN products p ON r.product_id = p.id 
            WHERE r.user_id = ? AND r.status = 'active' FOR UPDATE`, [userId]);

        if (reservations.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'El carrito está vacío o expiró.' });
        }

        let total = 0;
        const [order] = await connection.query('INSERT INTO orders (user_email, total) VALUES (?, 0)', [req.user.email]);
        
        for (const item of reservations) {
            if (item.stock < item.quantity) throw new Error(`Stock insuficiente: ${item.name}`);
            
            await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
            await connection.query('UPDATE reservations SET status = "purchased" WHERE id = ?', [item.id]);
            await connection.query('INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)', 
                [order.insertId, item.name, item.quantity, item.price]);
            
            total += parseFloat(item.price) * item.quantity;
        }

        await connection.query('UPDATE orders SET total = ? WHERE id = ?', [total, order.insertId]);
        await connection.commit();
        
        res.json({ success: true, message: 'Compra finalizada', orderId: order.insertId, total });

    } catch (e) {
        await connection.rollback();
        res.status(500).json({ message: e.message });
    } finally { connection.release(); }
};

// 5. VENTA NOCTURNA (ADMIN)
const toggleNightSale = async (req, res) => {
    const { active } = req.body;
    await pool.query('UPDATE promotions SET is_active = ? WHERE name = "Venta Nocturna"', [active ? 1 : 0]);
    // No cambiamos precios en DB permanentemente, solo el flag, el getProducts calcula el precio al vuelo.
    res.json({ success: true });
};

// 6. ADMIN: AGREGAR/BORRAR
const addProduct = async (req, res) => {
    const { name, description, price, stock, category, image_url, model_url } = req.body;
    try {
        await pool.query(
            'INSERT INTO products (name, description, base_price, price, stock, category, image_url, model_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, price, stock, category, image_url, model_url]
        );
        res.status(201).json({ message: 'Producto creado.' });
    } catch (e) { res.status(500).json({ message: 'Error creando.' }); }
};

const deleteProduct = async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Eliminado.' });
    } catch (e) { res.status(500).json({ message: 'Error eliminando.' }); }
};

module.exports = { getProducts, addToCart, getCart, checkout, toggleNightSale, addProduct, deleteProduct };