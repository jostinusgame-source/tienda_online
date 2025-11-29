const db = require('../config/database');

exports.getAllProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        // 1. Filtro Categoría
        if (category && category !== 'all') {
            query += " AND category = ?";
            params.push(category);
        }

        // 2. Búsqueda Texto (Nombre)
        if (search) {
            query += " AND LOWER(name) LIKE ?";
            params.push(`%${search.toLowerCase()}%`);
        }

        // 3. Búsqueda por Inicial (Nuevo Requerimiento)
        if (initial) {
            query += " AND name LIKE ?";
            params.push(`${initial}%`);
        }

        // 4. Filtro Precio (Considera descuentos)
        if (maxPrice) {
            query += " AND price <= ?";
            params.push(maxPrice);
        }

        // 5. Paginación (Cargar más)
        const limitVal = parseInt(limit) || 50;
        const offsetVal = parseInt(offset) || 0;
        query += " LIMIT ? OFFSET ?";
        params.push(limitVal, offsetVal);

        const [products] = await db.execute(query, params);
        
        // Verificar si hay Venta Nocturna Activa
        const [promos] = await db.execute('SELECT * FROM promotions WHERE is_active = 1 LIMIT 1');
        const activePromo = promos[0];

        const processed = products.map(p => {
            // Aplicar descuento en tiempo real si existe promo activa
            if (activePromo) {
                p.price = (p.base_price * (1 - activePromo.discount_percent)).toFixed(2);
                p.discount_applied = true;
                p.discount_percent = activePromo.discount_percent;
            }
            return p;
        });

        res.json(processed);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo productos', error });
    }
};

// Toggle Venta Nocturna (Admin)
exports.toggleNightSale = async (req, res) => {
    const { active } = req.body; // true/false
    try {
        await db.execute('UPDATE promotions SET is_active = ? WHERE name = "Venta Nocturna"', [active]);
        
        // Actualizar precios en la base de datos para consistencia
        if (active) {
            // Aplicar 20% descuento sobre base_price
            await db.execute('UPDATE products SET price = base_price * 0.80');
        } else {
            // Restaurar precios
            await db.execute('UPDATE products SET price = base_price');
        }
        
        res.json({ message: `Venta Nocturna ${active ? 'ACTIVADA' : 'DESACTIVADA'}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};