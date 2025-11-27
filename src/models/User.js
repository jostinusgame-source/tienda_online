const db = require('../config/database');

class User {
    static async create(userData) {
        const { name, email, password, role } = userData;
        // El rol por defecto es 'customer' si no se especifica
        const userRole = role || 'customer';
        
        const query = `
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [name, email, password, userRole]);
        return result.insertId;
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    }

    static async findById(id) {
        const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
}

module.exports = User;