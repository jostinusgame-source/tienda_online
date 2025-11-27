const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración del transporte (Gmail o SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail', // O usa host/port si tienes otro proveedor
    auth: {
        user: process.env.EMAIL_USER, // Tu correo (ej: tienda@gmail.com)
        pass: process.env.EMAIL_PASS  // TU "APP PASSWORD" (NO la normal)
    }
});

/**
 * Valida y clasifica el correo electrónico
 */
const validarTipoCorreo = (email) => {
    const dominio = email.split('@')[1].toLowerCase();
    
    // Listas de dominios
    const mundiales = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
    const esInstitucional = dominio.includes('.edu') || dominio.includes('unbosque') || dominio.includes('sena');

    let tipo = 'Empresarial/Otro';
    if (mundiales.includes(dominio)) tipo = 'Personal (Mundial)';
    if (esInstitucional) tipo = 'Institucional/Educativo';

    return { valido: true, tipo, dominio };
};

/**
 * Envía el correo genérico
 */
const sendEmail = async (to, subject, htmlContent) => {
    const validacion = validarTipoCorreo(to);
    console.log(`📧 Enviando a: ${to} [Tipo: ${validacion.tipo}]`);

    try {
        const info = await transporter.sendMail({
            from: `"Tienda Colección" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log('✅ Correo enviado ID:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        return false;
    }
};

/**
 * Enviar Código de Verificación
 */
const sendVerificationCode = async (email, code) => {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d9534f;">Verifica tu cuenta</h2>
            <p>Gracias por registrarte. Usa el siguiente código para validar tu identidad:</p>
            <h1 style="letter-spacing: 5px; background: #eee; padding: 10px; display: inline-block;">${code}</h1>
            <p>Este código expira en 10 minutos.</p>
        </div>
    `;
    return await sendEmail(email, 'Código de Verificación - Tienda Autos', html);
};

/**
 * Enviar Ticket de Compra
 */
const sendPurchaseTicket = async (email, orderData) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h1>¡Gracias por tu compra! 🚗</h1>
            <p>Tu pedido #${orderData.id} ha sido confirmado.</p>
            <h3>Total: $${orderData.total}</h3>
            <p>Tus autos llegarán pronto a tu garaje.</p>
        </div>
    `;
    return await sendEmail(email, 'Tu Ticket de Compra', html);
};

module.exports = {
    validarTipoCorreo,
    sendVerificationCode,
    sendPurchaseTicket
};