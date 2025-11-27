const nodemailer = require('nodemailer');
const dns = require('dns').promises;
require('dotenv').config();

// Configuración de Transporte (USAR APP PASSWORD DE GMAIL ES OBLIGATORIO)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // ¡SIN ESPACIOS!
    },
    tls: {
        rejectUnauthorized: false // Ayuda en entornos como Render
    }
});

// 1. Validar si el dominio existe (DNS MX Record)
const verificarDominioReal = async (email) => {
    const dominio = email.split('@')[1];
    try {
        const mxRecords = await dns.resolveMx(dominio);
        return mxRecords && mxRecords.length > 0;
    } catch (error) {
        return false;
    }
};

// 2. Enviar Código de Verificación
const sendVerificationCode = async (email, code) => {
    // Primero validamos dominio real
    const dominioValido = await verificarDominioReal(email);
    if (!dominioValido) {
        throw new Error("El dominio del correo no existe o no recibe emails.");
    }

    const html = `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <div style="background-color: #d90429; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">SPEEDCOLLECT</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; text-align: center;">
            <h2 style="color: #333;">Verifica tu Identidad</h2>
            <p style="color: #666; font-size: 16px;">Para completar tu registro, ingresa el siguiente código de seguridad. Este código expira en 5 minutos.</p>
            
            <div style="margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d90429; background: #eee; padding: 10px 20px; border-radius: 5px; border: 2px dashed #d90429;">
                    ${code}
                </span>
            </div>
            
            <p style="font-size: 12px; color: #999;">Si no solicitaste este código, ignora este mensaje.</p>
        </div>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Seguridad SpeedCollect" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🔐 Tu código es: ${code}`,
            html: html
        });
        console.log(`✅ Código enviado a ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Error enviando email:", error);
        throw new Error("Fallo al enviar el correo. Verifica tu dirección.");
    }
};

module.exports = { sendVerificationCode };