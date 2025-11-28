// src/controllers/reviewController.js
const Review = require('../models/Review');

const addReview = async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user.id; // Esto viene del Token JWT (usuario logueado)

        if (!rating || !comment) {
            return res.status(400).json({ message: 'Faltan datos (calificación o comentario)' });
        }

        const reviewId = await Review.create(userId, productId, rating, comment);

        // Devolvemos la reseña creada para que el Frontend la muestre al instante
        res.status(201).json({
            id: reviewId,
            user_name: req.user.name || 'Usuario', // Usamos el nombre del token
            rating,
            comment,
            created_at: new Date()
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar la reseña' });
    }
};

const getProductReviews = async (req, res) => {
    try {
        const reviews = await Review.findByProductId(req.params.productId);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo reseñas' });
    }
};

module.exports = { addReview, getProductReviews };