const nodemailer = require('nodemailer');
const dns = require('dns').promises;
require('dotenv').config();

// 1. Configuración ROBUSTA para Gmail (Puerto 465 SSL)
// Esto evita el error ETIMEDOUT en Render
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Usar SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Asegúrate que sea la App Password sin espacios
    },
    tls: {
        rejectUnauthorized: false // Ayuda a evitar errores de certificados en la nube
    },
    connectionTimeout: 10000 // 10 segundos máximo para conectar
});

// 2. Validar DNS (Para evitar correos a dominios falsos)
const verificarDominioReal = async (email) => {
    const dominio = email.split('@')[1];
    try {
        const mxRecords = await dns.resolveMx(dominio);
        return mxRecords && mxRecords.length > 0;
    } catch (error) {
        console.warn(`⚠️ Advertencia: No se pudo verificar DNS para ${dominio}, intentando enviar igual...`);
        return true; // En caso de fallo de DNS local, permitimos intentar el envío
    }
};

// 3. Enviar Código de Verificación
const sendVerificationCode = async (email, code) => {
    console.log(`📨 Intentando enviar correo a: ${email}...`);
    
    // Validación de dominio (Opcional si falla mucho el DNS)
    const dominioValido = await verificarDominioReal(email);
    if (!dominioValido) {
        throw new Error("El dominio del correo no parece real.");
    }

    const html = `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: white; padding: 20px; border-radius: 10px; border: 1px solid #d90429;">
        <div style="text-align: center; border-bottom: 1px solid #333; padding-bottom: 20px;">
            <h1 style="color: #d90429; margin: 0; text-transform: uppercase; font-style: italic;">SpeedCollect</h1>
            <p style="color: #999; margin-top: 5px;">Official Dealer</p>
        </div>
        <div style="padding: 30px; text-align: center;">
            <h2 style="color: white;">Verificación de Piloto</h2>
            <p style="color: #ccc; font-size: 16px;">Usa este código para encender motores y acceder a tu garaje:</p>
            
            <div style="margin: 30px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff; background: #d90429; padding: 15px 30px; border-radius: 5px; box-shadow: 0 0 15px #d90429;">
                    ${code}
                </span>
            </div>
            
            <p style="font-size: 12px; color: #666;">Este código expira en 10 minutos. Si no fuiste tú, ignora este mensaje.</p>
        </div>
    </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"SpeedCollect Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🔐 Tu código de acceso: ${code}`,
            html: html
        });
        console.log(`✅ Correo enviado con éxito. ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ ERROR CRÍTICO AL ENVIAR EMAIL:", error);
        // Lanzamos el error para que el Frontend lo sepa
        throw new Error(`Fallo SMTP: ${error.message}`);
    }
};

module.exports = { sendVerificationCode };