const pool = require('../config/database');

// --- PÚBLICO ---

const getProducts = async (req, res) => {
    try {
        // Seleccionamos TODOS los campos, incluyendo categoría
        const [products] = await pool.query('SELECT * FROM products');
        
        // NOTA: No cargamos las reseñas aquí para no hacer lento el catálogo principal.
        // Las reseñas se cargarán cuando el usuario haga clic en un producto específico.
        
        res.json(products);
    } catch (e) { 
        console.error(e);
        res.status(500).json({message: 'Error al obtener productos'}); 
    }
};

const createOrder = async (req, res) => {
    const { cart, email, total, paymentMethod } = req.body;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Validar Stock Estricto (Bloqueo de filas para evitar sobreventa)
        for (const item of cart) {
            const [rows] = await connection.query('SELECT stock, name FROM products WHERE id = ? FOR UPDATE', [item.id]);
            
            if (rows.length === 0) throw new Error(`Producto no existe: ${item.id}`);
            if (rows[0].stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${rows[0].name}. Quedan: ${rows[0].stock}`);
            }
            
            // 2. Descontar Stock
            await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
        }

        // 3. Crear Orden
        const [order] = await connection.query(
            'INSERT INTO orders (user_email, total, payment_method, status) VALUES (?, ?, ?, ?)',
            [email, total, paymentMethod, 'pending']
        );

        // 4. Crear Items de Orden
        for (const item of cart) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)',
                [order.insertId, item.name, item.quantity, item.price]
            );
        }

        await connection.commit();
        res.json({ success: true, orderId: order.insertId });

    } catch (error) {
        await connection.rollback();
        console.error("Error en createOrder:", error.message);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// --- ADMIN ---

const getDashboardStats = async (req, res) => {
    try {
        const [sales] = await pool.query('SELECT SUM(total) as total_sales, COUNT(*) as count FROM orders');
        const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
        
        res.json({
            sales: sales[0].total_sales || 0,
            orders: sales[0].count,
            users: users[0].count,
            products: products[0].count
        });
    } catch (e) { 
        res.status(500).json({message: 'Error obteniendo estadísticas'}); 
    }
};

const manageProducts = async (req, res) => {
    const { action, id, data } = req.body; // action: create, update, delete
    
    try {
        if(action === 'delete') {
            await pool.query('DELETE FROM products WHERE id = ?', [id]);
        
        } else if (action === 'create') {
            // Asegúrate de enviar 'category' desde el frontend (Camiseta, Auto, Raro)
            await pool.query(
                'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
                [data.name, data.description, data.price, data.stock, data.category || 'General', data.image_url]
            );
        
        } else if (action === 'update') {
            // ✅ CORREGIDO: Ahora actualiza TODOS los campos nuevos
            await pool.query(
                'UPDATE products SET name=?, description=?, price=?, stock=?, category=?, image_url=? WHERE id=?',
                [data.name, data.description, data.price, data.stock, data.category, data.image_url, id]
            );
        }
        res.json({message: 'Operación exitosa'});
    } catch(e) { 
        console.error(e);
        res.status(500).json({message: 'Error en gestión de productos'}); 
    }
};

module.exports = { getProducts, createOrder, getDashboardStats, manageProducts };