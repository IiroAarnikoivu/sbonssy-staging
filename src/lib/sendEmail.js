// lib/sendEmail.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || process.env.GRID_API_KEY);

export async function sendEmail({ to, subject, text, html }) {
  const msg = {
    to,
    from: "info@sbonssy.com",
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.body || error.message };
  }
}
