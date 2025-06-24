/**
 * Unified Communication Service
 * Handles all communication channels (Email, SMS, WhatsApp) for order notifications
 */

import { sendOTPEmail, sendOrderConfirmationEmail } from './emailService.js';
import { sendOTPSMS, sendOrderConfirmationSMS, sendStatusUpdateSMS } from './smsService.js';
import { sendOTPWhatsApp, sendOrderConfirmationWhatsApp, sendStatusUpdateWhatsApp } from './whatsappService.js';

/**
 * Send OTP notification via all available channels
 * @param {Object} user - User object with name, email, phone
 * @param {string} otp - OTP code
 * @param {string} orderId - Order ID
 * @param {Array} channels - Array of channels to use ['email', 'sms', 'whatsapp']
 * @returns {Promise<Object>} Results from all channels
 */
export const sendOTPNotification = async (user, otp, orderId, channels = ['email', 'sms', 'whatsapp']) => {
  const results = {
    email: null,
    sms: null,
    whatsapp: null,
    summary: {
      sent: 0,
      failed: 0,
      total: channels.length
    }
  };

  const promises = [];

  // Send Email
  if (channels.includes('email') && user.email) {
    promises.push(
      sendOTPEmail(user.email, user.name, otp, orderId)
        .then(result => {
          results.email = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.email = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Send SMS
  if (channels.includes('sms') && user.phone) {
    promises.push(
      sendOTPSMS(user.phone, user.name, otp, orderId)
        .then(result => {
          results.sms = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.sms = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Send WhatsApp
  if (channels.includes('whatsapp') && user.phone) {
    promises.push(
      sendOTPWhatsApp(user.phone, user.name, otp, orderId)
        .then(result => {
          results.whatsapp = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.whatsapp = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Wait for all notifications to complete
  await Promise.all(promises);

  console.log(`[NOTIFICATION] OTP sent for order ${orderId}:`, results.summary);
  return results;
};

/**
 * Send order confirmation notification via all available channels
 * @param {Object} user - User object with name, email, phone
 * @param {Object} order - Order object
 * @param {Array} channels - Array of channels to use ['email', 'sms', 'whatsapp']
 * @returns {Promise<Object>} Results from all channels
 */
export const sendOrderConfirmationNotification = async (user, order, channels = ['email', 'sms', 'whatsapp']) => {
  const results = {
    email: null,
    sms: null,
    whatsapp: null,
    summary: {
      sent: 0,
      failed: 0,
      total: channels.length
    }
  };

  const promises = [];

  // Send Email
  if (channels.includes('email') && user.email) {
    promises.push(
      sendOrderConfirmationEmail(user.email, user.name, order)
        .then(result => {
          results.email = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.email = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Send SMS
  if (channels.includes('sms') && user.phone) {
    promises.push(
      sendOrderConfirmationSMS(user.phone, user.name, order._id, order.totalAmount)
        .then(result => {
          results.sms = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.sms = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Send WhatsApp
  if (channels.includes('whatsapp') && user.phone) {
    promises.push(
      sendOrderConfirmationWhatsApp(user.phone, user.name, order._id, order.totalAmount)
        .then(result => {
          results.whatsapp = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.whatsapp = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Wait for all notifications to complete
  await Promise.all(promises);

  console.log(`[NOTIFICATION] Order confirmation sent for ${order._id}:`, results.summary);
  return results;
};

/**
 * Send order status update notification via all available channels
 * @param {Object} user - User object with name, email, phone
 * @param {string} orderId - Order ID
 * @param {string} status - New order status
 * @param {Array} channels - Array of channels to use ['sms', 'whatsapp']
 * @returns {Promise<Object>} Results from all channels
 */
export const sendStatusUpdateNotification = async (user, orderId, status, channels = ['sms', 'whatsapp']) => {
  const results = {
    sms: null,
    whatsapp: null,
    summary: {
      sent: 0,
      failed: 0,
      total: channels.length
    }
  };

  const promises = [];

  // Send SMS
  if (channels.includes('sms') && user.phone) {
    promises.push(
      sendStatusUpdateSMS(user.phone, user.name, orderId, status)
        .then(result => {
          results.sms = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.sms = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Send WhatsApp
  if (channels.includes('whatsapp') && user.phone) {
    promises.push(
      sendStatusUpdateWhatsApp(user.phone, user.name, orderId, status)
        .then(result => {
          results.whatsapp = result;
          if (result.success) results.summary.sent++;
          else results.summary.failed++;
        })
        .catch(error => {
          results.whatsapp = { success: false, error: error.message };
          results.summary.failed++;
        })
    );
  }

  // Wait for all notifications to complete
  await Promise.all(promises);

  console.log(`[NOTIFICATION] Status update sent for ${orderId}:`, results.summary);
  return results;
};

/**
 * Test all communication services
 * @param {string} testEmail - Test email address
 * @param {string} testPhone - Test phone number
 * @param {string} testName - Test name
 * @returns {Promise<Object>} Test results
 */
export const testCommunicationServices = async (testEmail, testPhone, testName = 'Test User') => {
  console.log('[TEST] Testing all communication services...');
  
  const testOTP = '123456';
  const testOrderId = 'TEST001';
  
  const results = await sendOTPNotification(
    { name: testName, email: testEmail, phone: testPhone },
    testOTP,
    testOrderId
  );
  
  return results;
};
