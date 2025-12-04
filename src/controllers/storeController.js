const pool = require('../config/database');

// --- CATÁLOGO ---
exports.getProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (category && category !== 'all') { query += " AND category = ?"; params.push(category); }
        if (maxPrice) { query += " AND price <= ?"; params.push(maxPrice); }
        
        if (initial) { 
            query += " AND name LIKE ?"; params.push(`${initial}%`); 
        } else if (search) { 
            query += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)"; 
            params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); 
        }

        // Ordenar por ID descendente (nuevos primero)
        query += " ORDER BY id DESC LIMIT ? OFFSET ?";
        params.push(parseInt(limit)||10, parseInt(offset)||0);

        const [products] = await pool.query(query, params);
        
        // Verificar Venta Nocturna (Seguro)
        let isNightSale = false;
        try {
            const [promos] = await pool.query('SELECT * FROM promotions WHERE name="Venta Nocturna" AND is_active=1');
            isNightSale = promos.length > 0;
        } catch(e) {}

        const processed = products.map(p => {
            let final = parseFloat(p.base_price || p.price);
            if(isNightSale) { final *= 0.8; p.discount = true; }
            p.price = final.toFixed(2);
            p.base_price = parseFloat(p.base_price||p.price).toFixed(2);
            return p;
        });

        res.json(processed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error cargando catálogo" });
    }
};

// --- CARRITO & COMPRA ---
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const [p] = await pool.query("SELECT stock FROM products WHERE id=?", [productId]);
        if(p.length===0 || p[0].stock < quantity) return res.status(400).json({message:"Stock insuficiente"});
        
        await pool.query("INSERT INTO reservations (user_id, product_id, quantity, expires_at) VALUES (?,?,?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))", 
            [req.user.id, productId, quantity]);
        res.json({message:"Agregado al garaje"});
    } catch(e) { res.status(500).json({message:"Error servidor"}); }
};

exports.getCart = async (req, res) => {
    try {
        const [items] = await pool.query(`SELECT r.id, p.name, p.price, r.quantity, (p.price*r.quantity) as subtotal FROM reservations r JOIN products p ON r.product_id=p.id WHERE r.user_id=? AND r.status='active'`, [req.user.id]);
        const total = items.reduce((a,b)=>a+parseFloat(b.subtotal),0);
        res.json({items, total});
    } catch(e) { res.status(500).json({message:"Error carrito"}); }
};

exports.checkout = async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        const [items] = await conn.query("SELECT r.*, p.price, p.stock FROM reservations r JOIN products p ON r.product_id=p.id WHERE r.user_id=? AND r.status='active' FOR UPDATE", [req.user.id]);
        
        if(items.length===0) { await conn.rollback(); return res.status(400).json({message:"Carrito vacío"}); }
        
        let total = 0;
        for(let item of items) {
            if(item.stock < item.quantity) throw new Error("Stock insuficiente");
            await conn.query("UPDATE products SET stock=stock-? WHERE id=?", [item.quantity, item.product_id]);
            await conn.query("UPDATE reservations SET status='purchased' WHERE id=?", [item.id]);
            total += parseFloat(item.price)*item.quantity;
        }
        const [ord] = await conn.query("INSERT INTO orders (user_email, total) VALUES (?,?)", [req.user.email, total]);
        await conn.commit();
        res.json({message:"Compra exitosa", orderId: ord.insertId, total});
        conn.release();
    } catch(e) { res.status(500).json({message: e.message || "Error pago"}); }
};

exports.toggleNightSale = async (req, res) => {
    try {
        await pool.query('UPDATE promotions SET is_active=? WHERE name="Venta Nocturna"', [req.body.active?1:0]);
        res.json({message:"Promo actualizada"});
    } catch(e) { res.status(500).json({message:"Error"}); }
};