const nodemailer = require('nodemailer');
require('dotenv').config();

// CONFIGURACIÓN ROBUSTA (PUERTO 465 - SSL)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // Puerto Seguro (Evita bloqueos de Render)
    secure: true, // TRUE para puerto 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Tu contraseña de aplicación de 16 letras
    },
    // Aumentamos los tiempos de espera para evitar el error ETIMEDOUT
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 10000,
    socketTimeout: 15000
});

// Verificación de conexión al iniciar (Para debug)
transporter.verify(function (error, success) {
    if (error) {
        console.log("❌ Error conectando al servidor de correos:", error.message);
    } else {
        console.log("✅ Servidor de correos listo y conectado.");
    }
});

const sendVerificationCode = async (email, code) => {
    console.log(`📨 Enviando código a: ${email}...`);
    
    const htmlContent = `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d90429; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SPEEDCOLLECT</h1>
        </div>
        <div style="padding: 30px; text-align: center; color: #333333;">
            <h2 style="margin-top: 0;">Verifica tu Cuenta</h2>
            <p>Estás a un paso de acceder al garaje más exclusivo. Usa este código:</p>
            <div style="margin: 30px 0;">
                <span style="display: inline-block; background-color: #f8f9fa; color: #d90429; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; border: 2px dashed #d90429;">
                    ${code}
                </span>
            </div>
            <p style="font-size: 14px; color: #666;">Este código expira en 10 minutos.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            &copy; 2025 SpeedCollect Inc. Todos los derechos reservados.
        </div>
    </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"SpeedCollect Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🚀 Tu Código de Acceso: ${code}`,
            html: htmlContent
        });
        console.log('✅ Correo enviado ID:', info.messageId);
        return true;
    } catch (error) {
        console.error("❌ ERROR FINAL EN EMAIL SERVICE:", error);
        // Lanzamos un error limpio para que el controlador lo entienda
        throw new Error(`Fallo SMTP: ${error.message}`);
    }
};

module.exports = { sendVerificationCode };