/**
 * OTP Utility Functions for Delivery Verification
 * Phase 1: Core OTP Generation and Validation
 */

/**
 * Generate a secure 6-digit OTP
 * @returns {string} 6-digit numeric OTP
 */
export const generateDeliveryOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create delivery OTP data structure for new orders
 * @returns {Object} Complete deliveryOtp object for order
 */
export const createDeliveryOTPData = () => {
  return {
    code: generateDeliveryOTP(),
    generatedAt: new Date(),
    isUsed: false,
    failedAttempts: [],
    lockoutUntil: null
  };
};

/**
 * Check if an order is currently locked out from OTP validation
 * @param {Object} order - Order document with deliveryOtp field
 * @returns {boolean} True if order is locked out
 */
export const isOrderLocked = (order) => {
  if (!order.deliveryOtp?.lockoutUntil) return false;
  return new Date() < order.deliveryOtp.lockoutUntil;
};

/**
 * Count recent failed attempts within the last 10 minutes
 * @param {Object} order - Order document with deliveryOtp field
 * @returns {number} Number of failed attempts in last 10 minutes
 */
export const getRecentFailedAttempts = (order) => {
  if (!order.deliveryOtp?.failedAttempts) return 0;
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  return order.deliveryOtp.failedAttempts.filter(
    attempt => attempt.attemptedAt > tenMinutesAgo
  ).length;
};

/**
 * Validate OTP format (6-digit numeric)
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if OTP format is valid
 */
export const isValidOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Check if order status allows OTP validation
 * Only allow validation when updating from 'Shipped' to 'Delivered'
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - New status being set
 * @returns {boolean} True if OTP validation is required
 */
export const requiresOTPValidation = (currentStatus, newStatus) => {
  return currentStatus.toLowerCase() === 'shipped' && newStatus.toLowerCase() === 'delivered';
};

/**
 * Check if OTP should be displayed to user
 * Only show OTP when order status is 'Shipped'
 * @param {string} orderStatus - Current order status
 * @returns {boolean} True if OTP should be displayed
 */
export const shouldDisplayOTP = (orderStatus) => {
  return orderStatus.toLowerCase() === 'shipped';
};

/**
 * Create failed attempt record
 * @param {string} attemptedCode - The OTP code that was attempted
 * @param {string} ipAddress - IP address of the attempt (optional)
 * @returns {Object} Failed attempt record
 */
export const createFailedAttemptRecord = (attemptedCode, ipAddress = null) => {
  return {
    attemptedAt: new Date(),
    attemptedCode,
    ipAddress
  };
};

/**
 * Calculate lockout expiry time (30 minutes from now)
 * @returns {Date} Lockout expiry time
 */
export const calculateLockoutExpiry = () => {
  return new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
};

/**
 * Get remaining lockout time in minutes
 * @param {Date} lockoutUntil - Lockout expiry time
 * @returns {number} Remaining minutes (0 if not locked)
 */
export const getRemainingLockoutTime = (lockoutUntil) => {
  if (!lockoutUntil) return 0;
  const remaining = Math.ceil((lockoutUntil - new Date()) / 60000);
  return Math.max(0, remaining);
};
