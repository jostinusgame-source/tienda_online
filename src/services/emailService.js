const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // O usa host/port si prefieres
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,  // Tu contraseña de aplicación, NO la normal
    }
});

const sendEmail = async (to, subject, htmlContent) => {
    try {
        await transporter.sendMail({
            from: '"Seguridad Tienda Online" <no-reply@tienda.com>',
            to,
            subject,
            html: htmlContent
        });
        console.log(`📧 Correo enviado a ${to}`);
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
    }
};

exports.sendVerificationCode = async (email, code) => {
    const html = `
        <h1>Verifica tu cuenta</h1>
        <p>Tu código de verificación es: <b>${code}</b></p>
        <p>Este código expira en 5 minutos.</p>
    `;
    await sendEmail(email, 'Código de Verificación', html);
};

exports.sendRecoveryCode = async (email, code) => {
    const html = `
        <h1>Recuperar Contraseña</h1>
        <p>Tu código para restablecer contraseña es: <b>${code}</b></p>
        <p>Este código expira en 5 minutos.</p>
    `;
    await sendEmail(email, 'Restablecer Contraseña', html);
};