const db = require('../config/database');

class User {
    static async create(userData) {
        // Ya no necesitamos códigos de verificación
        const { name, email, password, role, phone } = userData;
        const userRole = role || 'client';
        
        const query = `
            INSERT INTO users (name, email, password, role, phone) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [name, email, password, userRole, phone]);
        return result.insertId;
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    }

    static async findById(id) {
        const query = 'SELECT id, name, email, phone, role FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
}

module.exports = User;