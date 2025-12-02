const pool = require('../config/database');

const getProductReviews = async (req, res) => {
    const { productId } = req.params;
    try {
        const [reviews] = await pool.query(`
            SELECT r.rating, r.comment, u.name as user_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = ? AND r.approved = 1 
            ORDER BY r.created_at DESC`, 
            [productId]
        );
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Error cargando reseñas' });
    }
};

const addReview = async (req, res) => {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id; // Viene del authMiddleware

    try {
        // Verificar si ya compró el producto (Opcional, por ahora dejamos comentar a todos los logueados)
        await pool.query(
            'INSERT INTO reviews (user_id, product_id, rating, comment, approved) VALUES (?, ?, ?, ?, 1)',
            [userId, productId, rating, comment]
        );
        res.status(201).json({ message: 'Reseña agregada' });
    } catch (error) {
        res.status(500).json({ message: 'Error guardando reseña' });
    }
};

module.exports = { getProductReviews, addReview };