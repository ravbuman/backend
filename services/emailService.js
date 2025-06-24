/**
 * Brevo Email Service
 * Handles all email communications using Brevo API
 */
import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourstore.com';
const FROM_NAME = process.env.FROM_NAME || 'Your Store';

/**
 * Send email using Brevo API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content (optional)
 * @returns {Promise<Object>} Response from Brevo API
 */
export const sendEmail = async (to, subject, htmlContent, textContent = null) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not configured');
    }

    const emailData = {
      sender: {
        name: FROM_NAME,
        email: FROM_EMAIL
      },
      to: [
        {
          email: to
        }
      ],
      subject,
      htmlContent,
      ...(textContent && { textContent })
    };

    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      emailData,
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[EMAIL] Sent successfully to ${to}:`, response.data);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send OTP email to user
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} otp - OTP code
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Send result
 */
export const sendOTPEmail = async (email, name, otp, orderId) => {
  const subject = `🔒 Delivery Verification Code for Order #${orderId}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Verification Code</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 40px 30px; }
        .otp-box { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 36px; font-weight: bold; color: #0ea5e9; font-family: 'Courier New', monospace; letter-spacing: 4px; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Delivery Verification</h1>
          <p>Your order is ready for delivery!</p>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Great news! Your order <strong>#${orderId}</strong> has been shipped and is on its way to you.</p>
          
          <div class="otp-box">
            <h3>Your Delivery Verification Code:</h3>
            <div class="otp-code">${otp}</div>
            <p><small>Share this code with the delivery person to confirm delivery</small></p>
          </div>
          
          <div class="info-box">
            <h4>📋 Important Instructions:</h4>
            <ul>
              <li>Keep this code safe and only share it with the delivery person</li>
              <li>This code is required to mark your order as delivered</li>
              <li>Do not share this code with anyone else</li>
              <li>The code is valid until your order is delivered</li>
            </ul>
          </div>
          
          <p>If you have any questions about your delivery, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p><small>This is an automated message. Please do not reply to this email.</small></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Hi ${name},

    Your order #${orderId} has been shipped!

    Delivery Verification Code: ${otp}

    Please share this code with the delivery person to confirm delivery.

    Important:
    - Keep this code safe
    - Only share with the delivery person
    - Do not share with anyone else

    Thank you for shopping with us!
  `;

  return await sendEmail(email, subject, htmlContent, textContent);
};

/**
 * Send order confirmation email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {Object} order - Order details
 * @returns {Promise<Object>} Send result
 */
export const sendOrderConfirmationEmail = async (email, name, order) => {
  const subject = `✅ Order Confirmation #${order._id}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .order-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { border-bottom: 1px solid #e5e7eb; padding: 10px 0; }
        .total { font-weight: bold; font-size: 18px; color: #059669; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Order Confirmed!</h1>
          <p>Thank you for your order</p>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Your order has been confirmed and is being processed.</p>
          
          <div class="order-info">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> #${order._id}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          </div>
          
          <p>You will receive a delivery verification code when your order is shipped. Please keep that code safe as it will be required for delivery confirmation.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, htmlContent);
};
