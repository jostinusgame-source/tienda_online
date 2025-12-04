const pool = require('../config/database');

// 1. CATÁLOGO + PAGINACIÓN + BÚSQUEDA
const getProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (category && category !== 'all') { query += " AND category = ?"; params.push(category); }
        if (maxPrice) { query += " AND price <= ?"; params.push(maxPrice); }
        
        if (initial) { query += " AND name LIKE ?"; params.push(`${initial}%`); } 
        else if (search) { query += " AND LOWER(name) LIKE ?"; params.push(`%${search.toLowerCase()}%`); }

        const l = parseInt(limit) || 10;
        const o = parseInt(offset) || 0;
        query += " LIMIT ? OFFSET ?";
        params.push(l, o);

        const [products] = await pool.query(query, params);
        
        // VENTA NOCTURNA
        const [promos] = await pool.query('SELECT * FROM promotions WHERE name="Venta Nocturna" AND is_active=1');
        const isNightSale = promos.length > 0;

        const processed = products.map(p => {
            if (isNightSale) {
                p.price = (p.base_price * 0.80).toFixed(2); // 20% OFF
                p.discount = true;
            }
            return p;
        });
        res.json(processed);
    } catch (e) { res.status(500).json({ message: 'Error catálogo' }); }
};

// 2. CARRITO (RESERVAR STOCK)
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(`SELECT p.stock, (SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE product_id=p.id AND status='active') as reserved FROM products p WHERE p.id=?`, [productId]);
        if(rows.length===0) return res.status(404).json({message:'No existe'});
        
        if(rows[0].stock - rows[0].reserved < quantity) return res.status(400).json({message:'Sin stock'});
        
        const expires = new Date(Date.now() + 30*60000);
        await pool.query('INSERT INTO reservations (user_id, product_id, quantity, expires_at) VALUES (?,?,?,?)', [userId, productId, quantity, expires]);
        res.json({message:'Reservado por 30min'});
    } catch(e){ res.status(500).json({message:'Error reserva'}); }
};

// 3. VER CARRITO
const getCart = async (req, res) => {
    const userId = req.user.id;
    const [items] = await pool.query(`SELECT r.quantity, p.name, p.price FROM reservations r JOIN products p ON r.product_id=p.id WHERE r.user_id=? AND r.status='active'`, [userId]);
    const total = items.reduce((a,b)=>a+(b.price*b.quantity),0);
    res.json({items, total});
};

// 4. PAGAR
const checkout = async (req, res) => {
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [resv] = await conn.query(`SELECT * FROM reservations WHERE user_id=? AND status='active' FOR UPDATE`, [userId]);
        if(resv.length===0) throw new Error("Carrito vacío");
        
        const [ord] = await conn.query('INSERT INTO orders (user_email, total) VALUES (?, 0)', [req.user.email]);
        let total = 0;
        
        for(const r of resv) {
            // Obtener precio real al momento de la compra
            const [prod] = await conn.query('SELECT price, name, stock FROM products WHERE id=?', [r.product_id]);
            if(prod[0].stock < r.quantity) throw new Error(`Stock insuficiente: ${prod[0].name}`);

            await conn.query('UPDATE products SET stock=stock-? WHERE id=?', [r.quantity, r.product_id]);
            await conn.query('UPDATE reservations SET status="purchased" WHERE id=?', [r.id]);
            
            const itemTotal = parseFloat(prod[0].price) * r.quantity;
            total += itemTotal;
            
            await conn.query('INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?,?,?,?)', 
                [ord.insertId, prod[0].name, r.quantity, prod[0].price]);
        }
        await conn.query('UPDATE orders SET total=? WHERE id=?', [total, ord.insertId]);
        await conn.commit();
        res.json({success:true, orderId:ord.insertId, total});
    } catch(e){ await conn.rollback(); res.status(500).json({message:e.message}); } finally { conn.release(); }
};

const toggleNightSale = async (req, res) => {
    const { active } = req.body;
    await pool.query('UPDATE promotions SET is_active=? WHERE name="Venta Nocturna"', [active?1:0]);
    // Actualizar precio visual en DB para consistencia
    if(active) await pool.query('UPDATE products SET price=base_price*0.8');
    else await pool.query('UPDATE products SET price=base_price');
    res.json({success:true});
};

// ADMIN
const addProduct = async (req, res) => { /* Lógica admin */ }; 
const deleteProduct = async (req, res) => { /* Lógica admin */ };

module.exports = { getProducts, addToCart, getCart, checkout, toggleNightSale, addProduct, deleteProduct };