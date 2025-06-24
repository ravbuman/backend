/**
 * Enhanced Email Service using Brevo (Your Configuration)
 * Handles order-related email notifications
 */

import SibApiV3Sdk from 'sib-api-v3-sdk';
const defaultClient = SibApiV3Sdk.ApiClient.instance;
import dotenv from 'dotenv';

dotenv.config();

// Configure API key authorization
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

/**
 * Send Order Placed Email with order details and link
 * @param {string} email - User's email address
 * @param {string} userName - User's name
 * @param {Object} order - Order object with details
 * @returns {Promise<Object>} Response from Brevo API
 */
const sendOrderPlacedEmail = async (email, userName, order) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    // Generate order details HTML
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">${item.name}</td>
        <td style="padding: 12px; text-align: center;">${item.qty}</td>
        <td style="padding: 12px; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const orderDetailUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}`;
    
    sendSmtpEmail.subject = `Order Confirmed - #${order._id}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2ecc71, #27ae60); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed! 🎉</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order, ${userName}!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
          <h2 style="color: #2ecc71; margin-top: 0;">Order Details</h2>
          <p><strong>Order ID:</strong> #${order._id}</p>
          <p><strong>Order Date:</strong> ${new Date(order.placedAt || order.createdAt).toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="color: #2ecc71; border-bottom: 2px solid #2ecc71; padding-bottom: 10px;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #2ecc71; color: white;">
                <th style="padding: 12px; text-align: left;">Product</th>
                <th style="padding: 12px; text-align: center;">Quantity</th>
                <th style="padding: 12px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 5px;">
            <h3 style="margin: 0; color: #2ecc71;">Total Amount: ₹${order.totalAmount.toFixed(2)}</h3>
          </div>
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
          <h3 style="color: #2ecc71; margin-top: 0;">Shipping Address</h3>
          <p style="margin: 5px 0;"><strong>${order.shipping.name}</strong></p>
          <p style="margin: 5px 0;">${order.shipping.address}</p>
          <p style="margin: 5px 0;">Phone: ${order.shipping.phone}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderDetailUrl}" 
             style="background: linear-gradient(135deg, #2ecc71, #27ae60); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);">
            View Order Details 📦
          </a>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-top: 25px;">
          <h4 style="margin-top: 0; color: #856404;">📱 What's Next?</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>We'll send you updates as your order is processed</li>
            <li>You'll receive an OTP when your order is shipped</li>
            <li>Track your order using the link above</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>Thank you for choosing <strong>Indira-A1 Shop Like no Where</strong>!</p>
          <p>If you have any questions, please contact us at <a href="mailto:ravi@pydahsoft.in" style="color: #2ecc71;">ravi@pydahsoft.in</a></p>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.sender = { 
      name: "Indiraa1 Online Shopping", 
      email: "ravi@pydahsoft.in" 
    };
    sendSmtpEmail.to = [{ email, name: userName }];
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] Order placed email sent to ${email} for order ${order._id}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending order placed email:', error);
    throw new Error('Failed to send order confirmation email');
  }
};

/**
 * Send OTP Email when order is shipped
 * @param {string} email - User's email address
 * @param {string} userName - User's name
 * @param {string} otp - OTP code
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Response from Brevo API
 */
const sendOrderOtpEmail = async (email, userName, otp, orderId) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    const orderDetailUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${orderId}`;
    
    sendSmtpEmail.subject = `Order Shipped - Delivery OTP #${orderId}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped - OTP</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📦 Order Shipped!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your order is on its way, ${userName}!</p>
        </div>
        
        <div style="background: #e8f4fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
          <h2 style="color: #2980b9; margin-top: 0;">🔢 Delivery Verification Code</h2>
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 3px dashed #3498db;">
            <h1 style="color: #2980b9; font-size: 36px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </h1>
          </div>
          <p style="color: #2c3e50; margin: 15px 0;"><strong>Order ID:</strong> #${orderId}</p>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #856404;">🚚 Important Delivery Information</h3>
          <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
            <li><strong>Share this OTP with our delivery person</strong> when your order arrives</li>
            <li>This OTP confirms you have received your order</li>
            <li>Keep this code safe and don't share it with anyone else</li>
            <li>The delivery will be marked complete only after OTP verification</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderDetailUrl}" 
             style="background: linear-gradient(135deg, #3498db, #2980b9); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);">
            Track Your Order 🚚
          </a>
        </div>

        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-top: 25px;">
          <h4 style="margin-top: 0; color: #155724;">📍 Next Steps</h4>
          <ol style="margin: 10px 0; padding-left: 20px; color: #155724;">
            <li>Your order is being prepared for delivery</li>
            <li>You'll receive delivery updates soon</li>
            <li>Present this OTP code to our delivery person</li>
            <li>Enjoy your purchase!</li>
          </ol>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>Thank you for choosing <strong>Indira-A1 Shop like no where</strong>!</p>
          <p>For support, contact us at <a href="mailto:ravi@pydahsoft.in" style="color: #3498db;">ravi@pydahsoft.in</a></p>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.sender = { 
      name: "Indira-A1 Online Shopping", 
      email: "ravi@pydahsoft.in" 
    };
    sendSmtpEmail.to = [{ email, name: userName }];
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] OTP email sent to ${email} for order ${orderId} with OTP ${otp}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Send Order Delivered Email
 * @param {string} email - User's email address
 * @param {string} userName - User's name
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Response from Brevo API
 */
const sendOrderDeliveredEmail = async (email, userName, orderId) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    const orderDetailUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${orderId}`;
    
    sendSmtpEmail.subject = `Order Delivered Successfully - #${orderId}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2ecc71, #27ae60); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Order Delivered!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you ${userName}, your order has been successfully delivered!</p>
        </div>
        
        <div style="background: #d4edda; padding: 25px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
          <h2 style="color: #155724; margin-top: 0;">🎉 Delivery Confirmed</h2>
          <p style="color: #155724; font-size: 18px; margin: 15px 0;">
            Order <strong>#${orderId}</strong> has been successfully delivered and confirmed.
          </p>
          <p style="color: #155724; margin: 15px 0;">
            Delivered on: <strong>${new Date().toLocaleDateString('en-IN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</strong>
          </p>
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
          <h3 style="color: #2ecc71; margin-top: 0;">💚 Thank You for Your Business!</h3>
          <p style="margin: 10px 0;">We hope you're satisfied with your purchase. Your trust in <strong>Indira-A1 Online shopping</strong> means everything to us.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderDetailUrl}" 
             style="background: linear-gradient(135deg, #2ecc71, #27ae60); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);">
            View Order Details 📋
          </a>
        </div>

        <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
          <h3 style="color: #495057; margin-top: 0;">🛍️ Continue Shopping</h3>
          <p style="margin: 10px 0; color: #6c757d;">
            Discover more great products and take advantage of our latest offers!
          </p>
          <div style="text-align: center; margin-top: 15px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: linear-gradient(135deg, #6f42c1, #5a32a3); 
                      color: white; 
                      padding: 12px 25px; 
                      text-decoration: none; 
                      border-radius: 20px; 
                      font-weight: bold; 
                      display: inline-block;">
              Shop Now 🛒
            </a>
          </div>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-top: 25px;">
          <h4 style="margin-top: 0; color: #856404;">📞 Need Help?</h4>
          <p style="margin: 10px 0; color: #856404;">
            If you have any questions about your order or need assistance, please don't hesitate to contact us.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>Thank you for choosing <strong>Indira-A1 shop like no where</strong>!</p>
          <p>For support, contact us at <a href="mailto:ravi@pydahsoft.in" style="color: #2ecc71;">ravi@pydahsoft.in</a></p>
          <p style="margin-top: 15px; font-size: 12px; color: #999;">
            This email was sent to confirm the delivery of your order. Please keep this for your records.
          </p>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.sender = { 
      name: "Indira-A1 Online Shopping", 
      email: "ravi@pydahsoft.in" 
    };
    sendSmtpEmail.to = [{ email, name: userName }];
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] Delivery confirmation email sent to ${email} for order ${orderId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending delivery confirmation email:', error);
    throw new Error('Failed to send delivery confirmation email');
  }
};

export { 
  sendOrderPlacedEmail,
  sendOrderOtpEmail, 
  sendOrderDeliveredEmail 
};
