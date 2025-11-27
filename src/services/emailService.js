const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Limpieza de credenciales (Trim elimina espacios accidentales)
const mailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
const mailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';

console.log('📧 Iniciando servicio de correo...');
if (!mailUser || !mailPass) {
    console.error('❌ ERROR FATAL: Faltan credenciales de correo en .env');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: mailUser,
        pass: mailPass
    }
});

// Verificar conexión al iniciar
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ Error de conexión con Gmail:', error);
    } else {
        console.log('✅ Servidor de correos listo para enviar mensajes.');
    }
});

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: '"SpeedCollect Seguridad" <no-reply@speedcollect.com>',
            to: to, // El destinatario
            subject: subject,
            html: htmlContent
        });
        console.log(`📨 Correo enviado a ${to} | ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ FALLO ENVÍO a ${to}:`, error);
        return false;
    }
};

exports.sendVerificationCode = async (email, code) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #D40000; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">SpeedCollect</h1>
            </div>
            <div style="padding: 20px; background-color: #fff;">
                <h2 style="color: #333;">Verifica tu cuenta</h2>
                <p style="color: #666;">Gracias por unirte al club más exclusivo. Usa el siguiente código para activar tu cuenta:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f0f0f0; padding: 15px 30px; border-radius: 5px; border: 2px dashed #D40000;">${code}</span>
                </div>
                <p style="color: #999; font-size: 12px;">Este código expira en 5 minutos.</p>
            </div>
        </div>
    `;
    await sendEmail(email, 'Código de Activación - SpeedCollect', html);
};

exports.sendRecoveryCode = async (email, code) => {
    // ... (Lógica similar si la necesitas)
};