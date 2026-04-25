import nodemailer from "nodemailer";

// create transporter ONCE
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_SMTP_HOST,
  port: Number(process.env.MAILTRAP_SMTP_PORT),
  secure: false, // true if using port 465
  auth: {
    user: process.env.MAILTRAP_SMTP_USER,
    pass: process.env.MAILTRAP_SMTP_PASS,
  },
});

export const sendMail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"AI Support System" <no-reply@support.com>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    console.log("Email sent:", info.messageId);
    return info;

  } catch (error) {
    console.error("Error sending email:", error);
    throw error; //  Inngest retries
  }
};