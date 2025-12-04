const pool = require('../config/database');

const getProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (category && category !== 'all') { query += " AND category = ?"; params.push(category); }
        if (maxPrice) { query += " AND price <= ?"; params.push(maxPrice); }
        if (initial) { query += " AND name LIKE ?"; params.push(`${initial}%`); } 
        else if (search) { query += " AND LOWER(name) LIKE ?"; params.push(`%${search.toLowerCase()}%`); }

        // PAGINACIÓN SEGURA
        const l = parseInt(limit) || 10;
        const o = parseInt(offset) || 0;
        query += " ORDER BY id ASC LIMIT ? OFFSET ?";
        params.push(l, o);

        const [products] = await pool.query(query, params);
        
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
    } catch (e) { res.status(500).json({ message: 'Error catálogo' }); }
};

const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(`SELECT p.stock, (SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE product_id=p.id AND status='active') as reserved FROM products p WHERE p.id=?`, [productId]);
        if(rows.length===0) return res.status(404).json({message:'No existe'});
        
        const available = rows[0].stock - rows[0].reserved;
        if (available < quantity) return res.status(400).json({message:`Stock insuficiente. Quedan ${available}`});

        const expires = new Date(Date.now() + 30*60000);
        await pool.query('INSERT INTO reservations (user_id, product_id, quantity, expires_at) VALUES (?,?,?,?)', [userId, productId, quantity, expires]);
        res.json({message:'Agregado al garaje'});
    } catch(e){ res.status(500).json({message:'Error reserva'}); }
};

const getCart = async (req, res) => {
    const userId = req.user.id;
    try {
        const [items] = await pool.query(`SELECT r.quantity, p.name, p.price FROM reservations r JOIN products p ON r.product_id=p.id WHERE r.user_id=? AND r.status='active'`, [userId]);
        const total = items.reduce((a,b)=>a+(b.price*b.quantity),0);
        res.json({items, total});
    } catch (e) { res.status(500).json({ message: 'Error carrito' }); }
};

const checkout = async (req, res) => {
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [resv] = await conn.query(`SELECT * FROM reservations WHERE user_id=? AND status='active' FOR UPDATE`, [userId]);
        if(resv.length===0) { await conn.rollback(); return res.status(400).json({message:'Carrito vacío'}); }

        const [ord] = await conn.query('INSERT INTO orders (user_email, total) VALUES (?, 0)', [req.user.email]);
        let total = 0;
        
        for(const r of resv) {
            const [p] = await conn.query('SELECT price, stock FROM products WHERE id=?', [r.product_id]);
            if(p[0].stock < r.quantity) throw new Error("Stock agotado");
            
            await conn.query('UPDATE products SET stock=stock-? WHERE id=?', [r.quantity, r.product_id]);
            await conn.query('UPDATE reservations SET status="purchased" WHERE id=?', [r.id]);
            total += parseFloat(p[0].price) * r.quantity;
            
            await conn.query('INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?,?,?,?)', 
                [ord.insertId, "Auto ID "+r.product_id, r.quantity, p[0].price]);
        }
        await conn.query('UPDATE orders SET total=? WHERE id=?', [total, ord.insertId]);
        await conn.commit();
        res.json({success:true, orderId:ord.insertId, total});
    } catch(e){ await conn.rollback(); res.status(500).json({message:e.message}); } finally { conn.release(); }
};

const toggleNightSale = async (req, res) => {
    const { active } = req.body;
    await pool.query('UPDATE promotions SET is_active=? WHERE name="Venta Nocturna"', [active?1:0]);
    if(active) await pool.query('UPDATE products SET price=base_price*0.8');
    else await pool.query('UPDATE products SET price=base_price');
    res.json({success:true});
};

// Admin CRUD (Vacíos por ahora para no generar error, agrégalos si los necesitas)
const addProduct = async (req, res) => { res.json({message:'OK'}); };
const deleteProduct = async (req, res) => { res.json({message:'OK'}); };

module.exports = { getProducts, addToCart, getCart, checkout, toggleNightSale, addProduct, deleteProduct };