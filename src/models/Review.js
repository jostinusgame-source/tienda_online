// src/models/Review.js
const pool = require('../config/database');

const Review = {
    // Crear una reseña
    create: async (userId, productId, rating, comment) => {
        const query = 'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(query, [userId, productId, rating, comment]);
        
        // Devolvemos el ID de la reseña creada
        return result.insertId;
    },

    // Obtener reseñas de un producto (incluyendo el nombre del usuario)
    findByProductId: async (productId) => {
        const query = `
            SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `;
        const [rows] = await pool.query(query, [productId]);
        return rows;
    }
};

module.exports = Review;