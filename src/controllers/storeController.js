const pool = require('../config/database');

// 1. OBTENER PRODUCTOS (CON RESEÑAS)
const getProducts = async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products');
        
        // Agregar reseñas a cada producto
        for(let p of products) {
            const [reviews] = await pool.query('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [p.id]);
            p.reviews = reviews;
        }
        
        res.json(products);
    } catch (e) {
        res.status(500).json({message: 'Error al cargar productos'});
    }
};

// 2. CREAR PEDIDO (BAJA DE STOCK REAL)
const createOrder = async (req, res) => {
    const { cart, email, total } = req.body;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Verificar y descontar stock
        for (const item of cart) {
            const [rows] = await connection.query('SELECT stock FROM products WHERE id = ? FOR UPDATE', [item.id]);
            if (rows.length === 0 || rows[0].stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.name}`);
            }
            
            await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
        }

        // Registrar Orden
        await connection.query('INSERT INTO orders (user_email, total) VALUES (?, ?)', [email, total]);

        await connection.commit();
        res.json({ message: 'Compra exitosa', success: true });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message, success: false });
    } finally {
        connection.release();
    }
};

// 3. AGREGAR RESEÑA
const addReview = async (req, res) => {
    const { productId, userName, rating, comment } = req.body;
    try {
        await pool.query('INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)', 
            [productId, userName, rating, comment]);
        res.json({ message: 'Reseña agregada' });
    } catch (e) {
        res.status(500).json({ message: 'Error al guardar reseña' });
    }
};

module.exports = { getProducts, createOrder, addReview };