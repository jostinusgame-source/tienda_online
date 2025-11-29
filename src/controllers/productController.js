const pool = require('../config/database');

const getAllProducts = async (req, res) => {
    try {
        const { category, search, limit, offset, maxPrice, initial } = req.query;
        
        let query = "SELECT * FROM products WHERE 1=1";
        const params = [];

        // 1. Filtro Categoría
        if (category && category !== 'all') {
            query += " AND category = ?";
            params.push(category);
        }

        // 2. Búsqueda por Texto (Nombre)
        if (search) {
            query += " AND LOWER(name) LIKE ?";
            params.push(`%${search.toLowerCase()}%`);
        }

        // 3. Búsqueda por INICIAL (Ej: 'C' -> Chevrolet)
        if (initial) {
            query += " AND name LIKE ?";
            params.push(`${initial}%`); // Busca que empiece por la letra
        }

        // 4. Filtro Precio
        if (maxPrice) {
            query += " AND price <= ?";
            params.push(maxPrice);
        }

        // 5. Paginación (Cargar más)
        // Convertimos a enteros para evitar inyecciones
        const limitVal = parseInt(limit) || 10; // Default 10 autos
        const offsetVal = parseInt(offset) || 0;
        
        query += " LIMIT ? OFFSET ?";
        params.push(limitVal, offsetVal);

        const [products] = await pool.query(query, params);
        
        // Verificar si hay venta nocturna activa en DB
        const [promos] = await pool.query('SELECT * FROM promotions WHERE name="Venta Nocturna" AND is_active=1');
        const isNightSale = promos.length > 0;

        // Calcular precios finales antes de enviar
        const processed = products.map(p => {
            if (isNightSale) {
                p.price = (p.base_price * 0.80).toFixed(2); // 20% OFF
                p.discount = true;
            }
            return p;
        });

        res.json(processed);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error cargando catálogo' });
    }
};

module.exports = { getAllProducts };