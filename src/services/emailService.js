const nodemailer = require('nodemailer');
require('dotenv').config();

// Limpiar espacios en credenciales
const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
});

const sendVerificationCode = async (to, code) => {
    const html = `
        <div style="font-family: Arial; padding: 20px; border: 1px solid #eee; max-width: 500px;">
            <h2 style="color: #D40000; text-align: center;">SPEEDCOLLECT</h2>
            <p>Tu código de seguridad es:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                ${code}
            </div>
            <p style="font-size: 12px; color: #888; text-align: center; margin-top: 20px;">Válido por 15 minutos.</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: '"SpeedCollect Security" <no-reply@speedcollect.com>',
            to,
            subject: 'Código de Verificación',
            html
        });
        console.log(`📧 Enviado a ${to}`);
        return true;
    } catch (error) {
        console.error(`❌ Error email a ${to}:`, error.message);
        throw error; // Re-lanzar para manejarlo si es necesario
    }
};

module.exports = { sendVerificationCode };