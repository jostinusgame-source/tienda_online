const db = require('../config/database');

class User {
    static async create(userData) {
        // Agregamos 'phone' a la destructuración
        const { name, email, password, role, phone, email_verification_code, email_verification_expiration } = userData;
        const userRole = role || 'customer';
        
        // Query actualizado
        const query = `
            INSERT INTO users (name, email, password, role, phone, email_verification_code, email_verification_expiration, is_verified) 
            VALUES (?, ?, ?, ?, ?, ?, ?, false)
        `;
        
        // Array de valores actualizado
        const [result] = await db.execute(query, [name, email, password, userRole, phone, email_verification_code, email_verification_expiration]);
        return result.insertId;
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    }

    static async findById(id) {
        const query = 'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
}

module.exports = User;