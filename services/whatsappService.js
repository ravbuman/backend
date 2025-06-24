/**
 * WhatsApp Service
 * Handles WhatsApp communications using WATI API
 */
import axios from 'axios';

const WATI_API_KEY = process.env.WATI_API_KEY || 'smsapi wati';
const WATI_BASE_URL = process.env.WATI_BASE_URL || 'https://live-mt-server.wati.io/436509';

/**
 * Send WhatsApp template message using WATI API
 * @param {string} number - Phone number (with country code)
 * @param {string} templateName - Template name
 * @param {Array} parameters - Template parameters (optional)
 * @param {string} languageCode - Language code (optional, default: 'en')
 * @returns {Promise<Object>} Send result
 */
export const sendWhatsAppTemplate = async (
  number, 
  templateName, 
  parameters = [], 
  languageCode = 'en'
) => {
  try {
    if (!WATI_API_KEY || WATI_API_KEY === 'smsapi wati') {
      throw new Error('WATI API key not configured');
    }

    // Clean phone number (remove any non-digits except +)
    const cleanNumber = number.replace(/[^\d+]/g, '');

    const url = `${WATI_BASE_URL}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(cleanNumber)}`;
    
    const headers = {
      'Authorization': `Bearer ${WATI_API_KEY}`,
      'Content-Type': 'application/json-patch+json',
      'accept': '*/*',
    };

    const data = {
      template_name: templateName,
      broadcast_name: templateName,
      language_code: languageCode,
      ...(parameters.length > 0 && { parameters })
    };

    console.log(`[WHATSAPP] Sending template ${templateName} to ${cleanNumber}`);

    const response = await axios.post(url, data, { headers });

    console.log('[WHATSAPP] Response:', response.data);

    return { 
      success: true, 
      response: response.data,
      number: cleanNumber
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending message:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message,
      number
    };
  }
};

/**
 * Send simple WhatsApp text message (if template not available)
 * @param {string} number - Phone number
 * @param {string} message - Message content
 * @returns {Promise<Object>} Send result
 */
export const sendWhatsAppMessage = async (number, message) => {
  try {
    if (!WATI_API_KEY || WATI_API_KEY === 'smsapi wati') {
      throw new Error('WATI API key not configured');
    }

    const cleanNumber = number.replace(/[^\d+]/g, '');
    const url = `${WATI_BASE_URL}/api/v1/sendSessionMessage/${encodeURIComponent(cleanNumber)}`;
    
    const headers = {
      'Authorization': `Bearer ${WATI_API_KEY}`,
      'Content-Type': 'application/json-patch+json',
    };

    const data = {
      messageText: message
    };

    console.log(`[WHATSAPP] Sending message to ${cleanNumber}:`, message);

    const response = await axios.post(url, data, { headers });

    return { 
      success: true, 
      response: response.data,
      number: cleanNumber
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending message:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message,
      number
    };
  }
};

/**
 * Send OTP via WhatsApp
 * @param {string} phone - User phone number
 * @param {string} name - User name
 * @param {string} otp - OTP code
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Send result
 */
export const sendOTPWhatsApp = async (phone, name, otp, orderId) => {
  // Try template first, fallback to simple message
  const templateParameters = [name, orderId, otp];
  
  let result = await sendWhatsAppTemplate(phone, 'otp_delivery', templateParameters);
  
  if (!result.success) {
    // Fallback to simple message
    const message = `🔒 *Delivery Verification Code*\n\nHi ${name},\n\nYour order #${orderId} is shipped!\n\n*Verification Code: ${otp}*\n\nShare this code with the delivery person.\n⚠️ Do not share with others.\n\nThank you! 🛍️`;
    result = await sendWhatsAppMessage(phone, message);
  }
  
  return result;
};

/**
 * Send order confirmation via WhatsApp
 * @param {string} phone - User phone number
 * @param {string} name - User name
 * @param {string} orderId - Order ID
 * @param {number} totalAmount - Order total amount
 * @returns {Promise<Object>} Send result
 */
export const sendOrderConfirmationWhatsApp = async (phone, name, orderId, totalAmount) => {
  const templateParameters = [name, orderId, totalAmount.toString()];
  
  let result = await sendWhatsAppTemplate(phone, 'order_confirmation', templateParameters);
  
  if (!result.success) {
    // Fallback to simple message
    const message = `✅ *Order Confirmed!*\n\nHi ${name},\n\nYour order #${orderId} for ₹${totalAmount} has been confirmed!\n\nYou'll receive a delivery verification code when your order is shipped.\n\nThank you for shopping with us! 🛍️`;
    result = await sendWhatsAppMessage(phone, message);
  }
  
  return result;
};

/**
 * Send order status update via WhatsApp
 * @param {string} phone - User phone number
 * @param {string} name - User name
 * @param {string} orderId - Order ID
 * @param {string} status - New order status
 * @returns {Promise<Object>} Send result
 */
export const sendStatusUpdateWhatsApp = async (phone, name, orderId, status) => {
  let message;
  
  switch (status.toLowerCase()) {
    case 'shipped':
      message = `🚚 *Order Shipped!*\n\nHi ${name},\n\nGreat news! Your order #${orderId} has been shipped and is on its way to you.\n\nYou'll receive a delivery verification code soon.\n\nTrack your order for updates! 📦`;
      break;
    case 'delivered':
      message = `✅ *Order Delivered!*\n\nHi ${name},\n\nYour order #${orderId} has been delivered successfully!\n\nThank you for shopping with us! 🛍️\n\nPlease rate your experience! ⭐`;
      break;
    case 'cancelled':
      message = `❌ *Order Cancelled*\n\nHi ${name},\n\nYour order #${orderId} has been cancelled.\n\nIf you have any questions, please contact our support team.\n\nWe're here to help! 💬`;
      break;
    default:
      message = `📋 *Order Update*\n\nHi ${name},\n\nYour order #${orderId} status has been updated to: *${status}*\n\nThank you for your patience! 🙏`;
  }
  
  return await sendWhatsAppMessage(phone, message);
};
