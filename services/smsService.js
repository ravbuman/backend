/**
 * SMS Service
 * Handles SMS communications using BulkSMSApps API
 */
import axios from 'axios';

const API_KEY = process.env.SMS_API_KEY || 'apikey';
const API_URL = 'http://www.bulksmsapps.com/api/apismsv2.aspx';
const SENDER_ID = process.env.SMS_SENDER_ID || 'PYDAHK';
const TEMPLATE_ID = process.env.SMS_TEMPLATE_ID || '1607100000000129721';

/**
 * Send SMS using BulkSMSApps API
 * @param {string} number - Phone number (with country code)
 * @param {string} message - SMS message content
 * @param {string} templateId - Template ID (optional)
 * @returns {Promise<Object>} Send result
 */
export const sendSMS = async (number, message, templateId = TEMPLATE_ID) => {
  try {
    if (!API_KEY || API_KEY === 'apikey') {
      throw new Error('SMS API key not configured');
    }

    // Clean phone number (remove any non-digits except +)
    const cleanNumber = number.replace(/[^\d+]/g, '');

    const params = {
      apikey: API_KEY,
      sender: SENDER_ID,
      number: cleanNumber,
      message,
      templateid: templateId,
    };

    console.log(`[SMS] Sending to ${cleanNumber}:`, message);

    const response = await axios.get(API_URL, { params });

    console.log('[SMS] Response:', response.data);

    // Check if SMS was sent successfully
    const success = response.data && !response.data.toLowerCase().includes('error');
    
    return { 
      success, 
      response: response.data,
      number: cleanNumber
    };
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error.message);
    return { 
      success: false, 
      error: error.message,
      number
    };
  }
};

/**
 * Send OTP SMS to user
 * @param {string} phone - User phone number
 * @param {string} name - User name
 * @param {string} otp - OTP code
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Send result
 */
export const sendOTPSMS = async (phone, name, otp, orderId) => {
  const message = `Hi ${name}, your order #${orderId} is shipped! Delivery verification code: ${otp}. Share this code with delivery person. Do not share with others. - Your Store`;
  
  return await sendSMS(phone, message);
};

/**
 * Send order confirmation SMS
 * @param {string} phone - User phone number
 * @param {string} name - User name
 * @param {string} orderId - Order ID
 * @param {number} totalAmount - Order total amount
 * @returns {Promise<Object>} Send result
 */
export const sendOrderConfirmationSMS = async (phone, name, orderId, totalAmount) => {
  const message = `Hi ${name}, your order #${orderId} for ₹${totalAmount} has been confirmed! You'll receive a delivery code when shipped. Thanks for shopping with us!`;
  
  return await sendSMS(phone, message);
};

/**
 * Send order status update SMS
 * @param {string} phone - User phone number
 * @param {string} name - User name
 * @param {string} orderId - Order ID
 * @param {string} status - New order status
 * @returns {Promise<Object>} Send result
 */
export const sendStatusUpdateSMS = async (phone, name, orderId, status) => {
  let message;
  
  switch (status.toLowerCase()) {
    case 'shipped':
      message = `Hi ${name}, good news! Your order #${orderId} has been shipped and is on its way to you. You'll receive a delivery verification code soon.`;
      break;
    case 'delivered':
      message = `Hi ${name}, your order #${orderId} has been delivered successfully! Thank you for shopping with us.`;
      break;
    case 'cancelled':
      message = `Hi ${name}, your order #${orderId} has been cancelled. If you have any questions, please contact our support team.`;
      break;
    default:
      message = `Hi ${name}, your order #${orderId} status has been updated to: ${status}.`;
  }
  
  return await sendSMS(phone, message);
};
