import dotenv from 'dotenv';
dotenv.config();

import AWS from 'aws-sdk';
import path from 'path';
import Admin from '../models/Admin.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import * as notifications from '../notifications.js';
import { 
  sendOrderPlacedEmail,
  sendOrderOtpEmail,
  sendOrderDeliveredEmail
} from '../utils/emailSender.js';
import { 
  sendOTPNotification,
  sendOrderConfirmationNotification,
  sendStatusUpdateNotification,
  testCommunicationServices as testComm
} from '../services/communicationService.js';
import { 
  createDeliveryOTPData, 
  isOrderLocked, 
  getRecentFailedAttempts,
  isValidOTPFormat, 
  requiresOTPValidation,
  createFailedAttemptRecord,
  calculateLockoutExpiry,
  getRemainingLockoutTime
} from '../utils/otpUtils.js';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});
const BUCKET = process.env.AWS_S3_BUCKET;

// Upload a single image buffer to S3
async function uploadImageToS3(buffer, originalName, productName) {
  const ext = path.extname(originalName);
  const key = `${productName}/${Date.now()}${ext}`;
  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/' + ext.replace('.', ''),
    ACL: 'public-read'
  };
  const data = await s3.upload(params).promise();
  return data.Location;
}

// Helper to add id field to product(s)
function addIdField(product) {
  if (!product) return product;
  const obj = product.toObject ? product.toObject() : product;
  return { ...obj, id: obj._id?.toString?.() || obj._id };
}

// Variant helper functions
function getDisplayPrice(product) {
  if (!product.hasVariants || !product.variants || product.variants.length === 0) {
    return product.price;
  }
  
  // Return the cheapest variant price
  const prices = product.variants.map(v => v.price);
  return Math.min(...prices);
}

function getVariantById(product, variantId) {
  if (!product.hasVariants || !product.variants || !variantId) {
    return null;
  }
  return product.variants.find(v => v.id === variantId);
}

function getDefaultVariant(product) {
  if (!product.hasVariants || !product.variants || product.variants.length === 0) {
    return null;
  }
  
  // Find default variant or return cheapest one
  const defaultVariant = product.variants.find(v => v.isDefault);
  if (defaultVariant) return defaultVariant;
  
  // Return cheapest variant as default
  return product.variants.reduce((cheapest, current) => 
    current.price < cheapest.price ? current : cheapest
  );
}

function calculateVariantStock(product, variantId) {
  if (!product.hasVariants) {
    return product.stock;
  }
  
  const variant = getVariantById(product, variantId);
  return variant ? variant.stock : 0;
}

function getVariantPrice(product, variantId) {
  if (!product.hasVariants) {
    return product.price;
  }
  
  const variant = getVariantById(product, variantId);
  return variant ? variant.price : product.price;
}

// Create product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, hasVariants, variants } = req.body;
    
    // Handle images
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadImageToS3(file.buffer, file.originalname, name);
        images.push(url);
      }
    }
    
    // Parse variants if they exist
    let parsedVariants = [];
    if (hasVariants === 'true' && variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        // Generate unique IDs for variants
        parsedVariants = parsedVariants.map(variant => ({
          ...variant,
          id: variant.id || new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
          price: parseFloat(variant.price),
          stock: parseInt(variant.stock)
        }));
      } catch (error) {
        return res.status(400).json({ message: 'Invalid variants data format.' });
      }
    }
    
    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      images,
      hasVariants: hasVariants === 'true',
      variants: parsedVariants
    };
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json({ product: addIdField(product) });
  } catch (_err) {
    console.error('[CREATE PRODUCT]', _err);
    res.status(500).json({ message: 'Failed to create product.' });
  }
};

// Get all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ products: products.map(addIdField) });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch products.' });
  }
};

// Get product by id
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.userId', 'name email');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    
    // Ensure user names are available in reviews
    const productObj = product.toObject();
    productObj.reviews = productObj.reviews.map(review => ({
      ...review,
      user: review.user || review.userId?.name || review.userId?.email || 'Anonymous'
    }));
    
    res.json({ product: addIdField(productObj) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to fetch product.' });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, hasVariants, variants } = req.body;
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    
    // Handle images
    let images = product.images;
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadImageToS3(file.buffer, file.originalname, name || product.name);
        images.push(url);
      }
    }
    
    // Parse variants if they exist
    let parsedVariants = product.variants || [];
    if (hasVariants === 'true' && variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        // Ensure variants have proper data types and IDs
        parsedVariants = parsedVariants.map(variant => ({
          ...variant,
          id: variant.id || new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
          price: parseFloat(variant.price),
          stock: parseInt(variant.stock)
        }));
      } catch (error) {
        return res.status(400).json({ message: 'Invalid variants data format.' });
      }
    } else if (hasVariants === 'false') {
      parsedVariants = [];
    }
    
    const updateData = {
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      images,
      hasVariants: hasVariants === 'true',
      variants: parsedVariants
    };
    
    product.set(updateData);
    await product.save();
    res.json({ product: addIdField(product) });
  } catch (_err) {
    console.error('[UPDATE PRODUCT]', _err);
    res.status(500).json({ message: 'Failed to update product.' });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted.' });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to delete product.' });
  }
};

// Add or update review
export const addOrUpdateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Validation
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required.' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }
    
    if (comment.trim().length < 10) {
      return res.status(400).json({ message: 'Comment must be at least 10 characters long.' });
    }
    
    const userId = req.user.id;
    
    // Get user information
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    
    // Remove existing review by this user
    product.reviews = product.reviews.filter(r => r.userId.toString() !== userId);
    
    // Add new review
    const newReview = {
      userId,
      user: user.name || user.email, // Include user name
      rating: Number(rating),
      comment: comment.trim(),
      date: new Date(),
      createdAt: new Date()
    };
    
    product.reviews.push(newReview);
    await product.save();
    
    // Populate the reviews with user information
    await product.populate('reviews.userId', 'name email');
    
    res.json({ 
      message: 'Review added successfully',
      review: newReview,
      reviews: product.reviews 
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Failed to add review.' });
  }
};

// Get reviews
export const getReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ reviews: product.reviews });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
};

// Create order
export const createOrder = async (req, res) => {
  try {
    const { items, shipping, totalAmount, paymentMethod, coupon, upiTransactionId, paymentStatus } = req.body;
    const userId = req.user.id;
      // Validate required fields
    if (!items || !items.length) {
      return res.status(400).json({ message: 'Items are required' });
    }
    if (!shipping) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }
    if (!totalAmount) {
      return res.status(400).json({ message: 'Total amount is required' });
    }

    // Validate stock availability and prepare stock updates
    const stockUpdates = [];
    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.name} not found` });
      }

      if (item.hasVariant && item.variantId) {
        // Handle variant stock
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          return res.status(400).json({ message: `Variant not found for ${item.name}` });
        }
        if (variant.stock < item.qty) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${item.name} - ${item.variantName}. Available: ${variant.stock}, Required: ${item.qty}` 
          });
        }
        stockUpdates.push({
          productId: item.id,
          variantId: item.variantId,
          quantity: item.qty,
          type: 'variant'
        });
      } else {
        // Handle regular product stock
        if (product.stock < item.qty) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${item.name}. Available: ${product.stock}, Required: ${item.qty}` 
          });
        }
        stockUpdates.push({
          productId: item.id,
          quantity: item.qty,
          type: 'product'
        });
      }
    }

    let couponObjId = null;
    if (coupon) {
      couponObjId = coupon; // expects ObjectId from frontend
    }

    // Set payment status based on method and provided status
    let orderPaymentStatus = 'Pending';
    if (paymentMethod === 'UPI' && paymentStatus === 'paid') {
      orderPaymentStatus = 'UnderReview'; // UPI payments need admin verification
    } else if (paymentMethod === 'COD') {
      orderPaymentStatus = 'Pending';
    }    // Create order with OTP verification
    const order = new Order({
      userId,
      items,
      shipping,
      totalAmount,
      paymentMethod: paymentMethod.toUpperCase(), // Ensure uppercase
      paymentStatus: orderPaymentStatus,
      coupon: couponObjId,
      upiTransactionId: upiTransactionId || null,
      deliveryOtp: createDeliveryOTPData() // Generate OTP for delivery verification
    });
    
    await order.save();

    // Reduce stock after successful order creation
    for (const update of stockUpdates) {
      if (update.type === 'variant') {
        await Product.updateOne(
          { _id: update.productId, 'variants.id': update.variantId },
          { $inc: { 'variants.$.stock': -update.quantity } }
        );
      } else {
        await Product.updateOne(
          { _id: update.productId },
          { $inc: { stock: -update.quantity } }
        );
      }
    }    // Notify all admins of new order
    try {
      const admins = await Admin.find({ pushToken: { $exists: true, $ne: null } });
      const user = await User.findById(userId);
      if (admins.length > 0 && user) {
        await notifications.notifyAdminsNewOrder(admins, order._id, user.name);
      } else {
        console.log('[ORDER] No push notifications sent - missing admins or user');
      }

      // Send order placed email using your Brevo service
      if (user && user.email) {
        try {
          await sendOrderPlacedEmail(user.email, user.name, order);
          console.log(`[EMAIL] Order placed email sent to ${user.email} for order ${order._id}`);
        } catch (emailError) {
          console.error('[EMAIL] Order placed email error:', emailError);
          // Don't fail order creation if email fails
        }
      }

      // Send order confirmation via other channels (SMS, WhatsApp)
      if (user && user.phone) {
        try {
          const confirmationResult = await sendOrderConfirmationNotification(user, order, ['sms', 'whatsapp']);
          console.log(`[ORDER] SMS/WhatsApp confirmation sent for order ${order._id}:`, confirmationResult.summary);
        } catch (confirmError) {
          console.error('[ORDER] SMS/WhatsApp confirmation error:', confirmError);
          // Don't fail order creation if confirmation fails
        }
      }
    } catch (notifError) {
      console.error('[ORDER] Notification error:', notifError);
      // Don't fail order creation if notifications fail
    }

    res.status(201).json({ order });
  } catch (error) {
    console.error('[CREATE ORDER] Error:', error);
    res.status(500).json({ message: 'Failed to create order.', error: error.message });
  }
};

// Get orders for user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId }).sort({ placedAt: -1 });
    res.json({ orders });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    // Only log user if present (route is public for now)
    if (req.user && req.user.adminId) {
      console.log('Fetching all orders for admin:');
    } else {
      console.log('Fetching all orders (no user attached to request)');
    }
    const orders = await Order.find().sort({ placedAt: -1 });
    // Add id field for frontend compatibility
    console.log('Orders fetched:', orders.length);
    
    res.json({ orders: orders.map(order => ({ ...order.toObject(), id: order._id })) });
  } catch (_err) {
    console.error('[GET ALL ORDERS]', _err);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};

// Update order status (admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, deliveryOtp } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Check if OTP validation is required for this status update
    if (requiresOTPValidation(order.status, status)) {
      // Validate OTP when updating to "Delivered"
      if (!deliveryOtp) {
        return res.status(400).json({ 
          message: 'Delivery verification code is required to mark order as delivered.',
          requiresOtp: true
        });
      }

      // Validate OTP format
      if (!isValidOTPFormat(deliveryOtp)) {
        return res.status(400).json({ 
          message: 'Invalid verification code format. Please enter a 6-digit code.',
          requiresOtp: true
        });
      }

      // Check if order is locked out
      if (isOrderLocked(order)) {
        const remainingTime = getRemainingLockoutTime(order.deliveryOtp.lockoutUntil);
        return res.status(429).json({ 
          message: `Too many failed attempts. Please try again in ${remainingTime} minutes.`,
          requiresOtp: true,
          lockoutMinutes: remainingTime
        });
      }

      // Check if OTP has already been used
      if (order.deliveryOtp.isUsed) {
        return res.status(400).json({ 
          message: 'This delivery verification code has already been used.',
          requiresOtp: true
        });
      }

      // Validate the OTP
      if (order.deliveryOtp.code !== deliveryOtp) {
        // Record failed attempt
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const failedAttempt = createFailedAttemptRecord(deliveryOtp, clientIP);
        order.deliveryOtp.failedAttempts.push(failedAttempt);

        // Check if should lock out (3 failed attempts in 10 minutes)
        const recentFailures = getRecentFailedAttempts(order);
        if (recentFailures >= 3) {
          order.deliveryOtp.lockoutUntil = calculateLockoutExpiry();
          await order.save();
          
          return res.status(429).json({ 
            message: 'Too many failed attempts. Account locked for 30 minutes.',
            requiresOtp: true,
            lockoutMinutes: 30
          });
        }

        await order.save();
        
        return res.status(400).json({ 
          message: `Invalid verification code. ${3 - recentFailures} attempts remaining.`,
          requiresOtp: true,
          attemptsRemaining: 3 - recentFailures
        });
      }

      // OTP is valid - mark as used and add delivered timestamp
      order.deliveryOtp.isUsed = true;
      order.deliveredAt = new Date();
    }    // Update order status
    order.status = status;

    // If admin marks UPI order as paid, also update paymentStatus
    if (order.paymentMethod === 'UPI' && status === 'Paid') {
      order.paymentStatus = 'Paid';
    }

    await order.save();

    // Get user for notifications
    const user = await User.findById(order.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found for order notifications.' });
    }    // Handle special status-based notifications
    try {
      // Send OTP when order is shipped - using your Brevo email service
      if (status === 'Shipped' && order.deliveryOtp && order.deliveryOtp.code) {
        // Send OTP via your Brevo email service
        if (user.email) {
          try {
            await sendOrderOtpEmail(user.email, user.name, order.deliveryOtp.code, order._id.toString());
            console.log(`[EMAIL] OTP email sent to ${user.email} for shipped order ${order._id}`);
          } catch (otpEmailError) {
            console.error('[EMAIL] OTP email error:', otpEmailError);
          }
        }

        // Send OTP via SMS and WhatsApp as backup
        if (user.phone) {
          try {
            const otpResult = await sendOTPNotification(
              user, 
              order.deliveryOtp.code, 
              order._id.toString(),
              ['sms', 'whatsapp'] // Only SMS and WhatsApp, email handled above
            );
            console.log(`[ORDER] OTP sent via SMS/WhatsApp for shipped order ${order._id}:`, otpResult.summary);
          } catch (otpError) {
            console.error('[ORDER] SMS/WhatsApp OTP notification error:', otpError);
          }
        }
      }

      // Send delivery confirmation email when order is delivered
      if (status === 'Delivered' && user.email) {
        try {
          await sendOrderDeliveredEmail(user.email, user.name, order._id.toString());
          console.log(`[EMAIL] Delivery confirmation email sent to ${user.email} for order ${order._id}`);
        } catch (deliveryEmailError) {
          console.error('[EMAIL] Delivery confirmation email error:', deliveryEmailError);
        }
      }

      // Send status update via SMS and WhatsApp for other status changes
      if (user.phone && status !== 'Shipped') // Skip shipped since we handle it above
      {
        try {
          const statusResult = await sendStatusUpdateNotification(user, order._id.toString(), status, ['sms', 'whatsapp']);
          console.log(`[ORDER] Status update sent for ${order._id}:`, statusResult.summary);
        } catch (statusError) {
          console.error('[ORDER] Status update notification error:', statusError);
          // Don't fail status update if notifications fail
        }
      }

      // Legacy push notification (keep for compatibility)
      await notifications.notifyOrderStatus(user, order._id, status);

      // Special handling for UPI payment confirmation
      if (order.paymentMethod === 'UPI' && status === 'Paid') {
        await notifications.sendPushNotification(
          user.pushToken,
          'Payment Received',
          `Your UPI payment for order #${order._id} has been verified and marked as paid.`,
          { orderId: order._id, status: 'Paid' }
        );
      }
    } catch (notificationError) {
      console.error('[ORDER] Notification error:', notificationError);
      // Don't fail status update if notifications fail
    }

    res.json({ 
      order,
      message: status === 'Delivered' ? 'Order delivered successfully!' : 'Order status updated successfully!'
    });
  } catch (error) {
    console.error('[UPDATE ORDER STATUS] Error:', error);
    res.status(500).json({ message: 'Failed to update order status.' });
  }
};

// Cancel order (user)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status !== 'Pending') return res.status(400).json({ message: 'Cannot cancel order after it is shipped.' });
    
    // Restore stock when order is cancelled
    for (const item of order.items) {
      if (item.hasVariant && item.variantId) {
        // Restore variant stock
        await Product.updateOne(
          { _id: item.id, 'variants.id': item.variantId },
          { $inc: { 'variants.$.stock': item.qty } }
        );
      } else {
        // Restore regular product stock
        await Product.updateOne(
          { _id: item.id },
          { $inc: { stock: item.qty } }
        );
      }
    }
    
    order.status = 'Cancelled';
    await order.save();
    res.json({ order });
  } catch (error) {
    console.error('[CANCEL ORDER] Error:', error);
    res.status(500).json({ message: 'Failed to cancel order.' });
  }
};

// Get order by ID (user or admin)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('coupon');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    // Fetch user details for admin view
    let userDetails = null;
    if (req.user.isAdmin) {
      const user = await import('../models/User.js').then(m => m.default.findById(order.userId));
      if (user) {
        userDetails = {
          id: user._id,
          name: user.name,
          phone: user.phone
        };
      }
    }
    res.json({ order, user: userDetails });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch order.' });
  }
};

//   Wishlist  
export const getWishlist = async (req, res) => {
  try {

    const user = await import('../models/User.js').then(m => m.default.findById(req.user.id));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ wishlist: user.wishlist.map(p => p.toObject ? { ...p.toObject(), id: p._id } : p) });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch wishlist.' });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await import('../models/User.js').then(m => m.default.findById(req.user.id));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.wishlist.map(id => id.toString()).includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    res.json({ wishlist: user.wishlist });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to add to wishlist.' });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await import('../models/User.js').then(m => m.default.findById(req.user.id));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to remove from wishlist.' });
  }
};

export const clearWishlist = async (req, res) => {
  try {
    const user = await import('../models/User.js').then(m => m.default.findById(req.user.id));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.wishlist = [];
    await user.save();
    res.json({ wishlist: [] });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to clear wishlist.' });
  }
};

// New endpoint: getWishlistByUserId (fetches user, then fetches products by ID)
export const getWishlistByUserId = async (req, res) => {
  try {
    const user = await import('../models/User.js').then(m => m.default.findById(req.user.id));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.wishlist || user.wishlist.length === 0) return res.json({ wishlist: [] });
    // Fetch products by IDs in wishlist
    const products = await import('../models/Product.js').then(m => m.default.find({ _id: { $in: user.wishlist } }));
    // Add id field for frontend compatibility
    const wishlist = products.map(p => ({ ...p.toObject(), id: p._id }));
    res.json({ wishlist });
  } catch (err) {
    console.error('[GET WISHLIST BY USER]', err);
    res.status(500).json({ message: 'Failed to fetch wishlist.' });
  }
};

//   Cart  
// Improved getCart: fetch user, then fetch product details for all cart items
export const getCart = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.cart || user.cart.length === 0) return res.json({ cart: [] });
    
    // Get all product IDs in cart
    const productIds = user.cart.map(item => item.product);
    
    // Fetch product details for all cart items
    const products = await Product.find({ _id: { $in: productIds } });
    
    // Map cart items to include product details, quantity, and variant info
    const cart = user.cart.map(item => {
      const prod = products.find(p => p._id.toString() === item.product.toString());
      if (!prod) return null;
      
      const cartItem = {
        ...prod.toObject(),
        id: prod._id,
        qty: item.quantity,
        addedAt: item.addedAt
      };
      
      // Add variant information if present
      if (item.variantId && prod.hasVariants) {
        const variant = getVariantById(prod, item.variantId);
        if (variant) {
          cartItem.selectedVariant = {
            id: item.variantId,
            name: item.variantName || variant.name,
            label: variant.label,
            price: item.variantPrice || variant.price,
            originalPrice: variant.originalPrice,
            stock: variant.stock,
            images: variant.images
          };
          // Override main product price with variant price for cart calculations
          cartItem.price = item.variantPrice || variant.price;
        }
      }
      
      return cartItem;
    }).filter(Boolean);

    res.json({ cart });
  } catch (err) {
    console.error('[GET CART]', err);
    res.status(500).json({ message: 'Failed to fetch cart.' });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variantId } = req.body;
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    // Get product to validate variant
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    
    let variantInfo = null;
    let itemPrice = product.price;
    let stockToCheck = product.stock;
    
    // Handle variant validation and pricing
    if (product.hasVariants) {
      if (!variantId) {
        // Auto-select default/cheapest variant if none provided
        const defaultVariant = getDefaultVariant(product);
        if (!defaultVariant) {
          return res.status(400).json({ message: 'No variants available for this product.' });
        }
        variantInfo = defaultVariant;
      } else {
        variantInfo = getVariantById(product, variantId);
        if (!variantInfo) {
          return res.status(400).json({ message: 'Invalid variant selected.' });
        }
      }
      
      itemPrice = variantInfo.price;
      stockToCheck = variantInfo.stock;
      
      // Check variant stock
      if (stockToCheck < quantity) {
        return res.status(400).json({ message: `Only ${stockToCheck} items available for this variant.` });
      }
    } else {
      // Regular product stock check
      if (stockToCheck < quantity) {
        return res.status(400).json({ message: `Only ${stockToCheck} items available.` });
      }
    }
    
    // Check if item with same variant already exists in cart
    const cartKey = variantInfo ? `${productId}-${variantInfo.id}` : productId;
    const idx = user.cart.findIndex(item => {
      if (variantInfo) {
        return item.product.toString() === productId && item.variantId === variantInfo.id;
      }
      return item.product.toString() === productId && !item.variantId;
    });
    
    if (idx > -1) {
      // Update existing cart item
      user.cart[idx].quantity += quantity;
      if (variantInfo) {
        user.cart[idx].variantPrice = itemPrice; // Update price in case it changed
      }
    } else {
      // Add new cart item
      const cartItem = {
        product: productId,
        quantity: quantity
      };
      
      if (variantInfo) {
        cartItem.variantId = variantInfo.id;
        cartItem.variantName = variantInfo.name;
        cartItem.variantPrice = itemPrice;
      }
      
      user.cart.push(cartItem);
    }
    
    await user.save();
    res.json({ cart: user.cart, message: 'Added to cart successfully' });
  } catch (err) {
    console.error('[ADD TO CART]', err);
    res.status(500).json({ message: 'Failed to add to cart.' });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    // Remove specific variant or all variants of product
    user.cart = user.cart.filter(item => {
      if (variantId) {
        // Remove specific variant
        return !(item.product.toString() === productId && item.variantId === variantId);
      } else {
        // Remove all variants of this product
        return item.product.toString() !== productId;
      }
    });
    
    await user.save();
    res.json({ cart: user.cart, message: 'Removed from cart successfully' });
  } catch (err) {
    console.error('[REMOVE FROM CART]', err);
    res.status(500).json({ message: 'Failed to remove from cart.' });
  }
};

export const clearCart = async (req, res) => {
  try {
    console.log('[CLEAR CART] Request received for user:', req.user.id);
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[CLEAR CART] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found.' });
    }
    
    console.log('[CLEAR CART] Current cart length:', user.cart.length);
    user.cart = [];
    await user.save();
    console.log('[CLEAR CART] Cart cleared successfully for user:', req.user.id);
    res.json({ message: 'Cart cleared successfully', cart: [] });
  } catch (err) {
    console.error('[CLEAR CART] Error:', err);
    res.status(500).json({ message: 'Failed to clear cart.' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    console.log('Updating cart item for user:', req.user.id);
    console.log('Request body:', req.body);
    const { productId, qty, variantId } = req.body;
    if (!productId || !qty) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ message: 'Invalid productId or quantity.' });
    }
    
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id);
    if (!user) { 
      console.error('User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found.' });
    }
    
    console.log('User cart before update:', user.cart);
    
    // Find cart item by product and variant
    const idx = user.cart.findIndex(item => {
      if (variantId) {
        return item.product.toString() === productId && item.variantId === variantId;
      }
      return item.product.toString() === productId && !item.variantId;
    });
    
    if (idx === -1) {
      return res.status(404).json({ message: 'Product variant not found in cart.' });
    }
    
    // Validate stock for the quantity update
    const product = await Product.findById(productId);
    if (product) {
      let stockToCheck = product.stock;
      if (product.hasVariants && variantId) {
        const variant = getVariantById(product, variantId);
        stockToCheck = variant ? variant.stock : 0;
      }
      
      if (qty > stockToCheck) {
        return res.status(400).json({ message: `Only ${stockToCheck} items available.` });
      }
    }
    
    if (qty < 1) {
      // Remove item if quantity is less than 1
      user.cart.splice(idx, 1);
    } else {
      user.cart[idx].quantity = parseInt(qty);
    }
    
    await user.save();
    
    // Return updated cart with product details
    if (!user.cart || user.cart.length === 0) return res.json({ cart: [] });
    
    const productIds = user.cart.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    
    const cart = user.cart.map(item => {
      const prod = products.find(p => p._id.toString() === item.product.toString());
      if (!prod) return null;
      
      const cartItem = {
        ...prod.toObject(),
        id: prod._id,
        qty: item.quantity,
      };
      
      // Add variant information if present
      if (item.variantId) {
        cartItem.selectedVariant = {
          id: item.variantId,
          name: item.variantName,
          price: item.variantPrice
        };
      }
      
      return cartItem;
    }).filter(Boolean);
      res.json({ cart });
  } catch (err) {
    console.error('[UPDATE CART ITEM]', err);
    res.status(500).json({ message: 'Failed to update cart item.' });
  }
};

// Add address to user profile
export const addUserAddress = async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    if (!name || !address || !phone) {
      return res.status(400).json({ message: 'All address fields are required.' });
    }
    const user = await import('../models/User.js').then(m => m.default.findById(req.user.id));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.addresses.push({ name, address, phone });
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (err) {
    console.error('[ADD USER ADDRESS]', err);
    res.status(500).json({ message: 'Failed to add address.' });
  }
};

// Admin marks order as paid after reviewing UPI transaction
export const markOrderAsPaid = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    order.paymentStatus = 'Paid';
    await order.save();
    // Notify user when order is marked as paid
    const user = await User.findById(order.userId);
    if (user && user.pushToken) {
      await notifications.sendPushNotification(
        user.pushToken,
        'Payment Received',
        `Your payment for order #${order._id} has been verified and marked as paid.`,
        { orderId: order._id, status: 'Paid' }
      );
    }
    res.json({ success: true, order });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to mark order as paid.' });
  }
};

// Get all users (admin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await import('../models/User.js').then(m => m.default.find({}, '-password'));
    // Add id field for frontend compatibility
    res.json({ users: users.map(u => ({ ...u.toObject(), id: u._id, userId: u._id })) });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

// Get all orders for a user (admin)
export const getOrdersByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId }).sort({ placedAt: -1 });
    res.json({ orders: orders.map(order => ({ ...order.toObject(), id: order._id })) });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to fetch user orders.' });
  }
};

// Update order (for UPI UTR submission or admin payment status update)
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { upiTransactionId, paymentStatus, paymentMethod } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (upiTransactionId !== undefined) order.upiTransactionId = upiTransactionId;
    if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) order.paymentMethod = paymentMethod;
    await order.save();
    res.json({ success: true, order });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to update order.' });
  }
};

// Test communication services (admin only)
export const testCommunicationServices = async (req, res) => {
  try {
    const { testEmail, testPhone, testName = 'Test User' } = req.body;

    if (!testEmail && !testPhone) {
      return res.status(400).json({ 
        message: 'Please provide at least testEmail or testPhone for testing.' 
      });
    }

    console.log('[TEST] Testing communication services with:', { testEmail, testPhone, testName });

    // Test OTP notification
    const testOTP = '123456';
    const testOrderId = 'TEST-' + Date.now();
    
    const otpResult = await sendOTPNotification(
      { name: testName, email: testEmail, phone: testPhone },
      testOTP,
      testOrderId
    );

    // Test order confirmation (create a mock order)
    const mockOrder = {
      _id: testOrderId,
      totalAmount: 999.99,
      items: [{ name: 'Test Product', qty: 1, price: 999.99 }],
      shipping: { address: 'Test Address' }
    };

    const confirmResult = await sendOrderConfirmationNotification(
      { name: testName, email: testEmail, phone: testPhone },
      mockOrder
    );

    // Test status update
    const statusResult = await sendStatusUpdateNotification(
      { name: testName, email: testEmail, phone: testPhone },
      testOrderId,
      'Shipped'
    );

    res.json({
      success: true,
      message: 'Communication services test completed',
      results: {
        otp: otpResult,
        orderConfirmation: confirmResult,
        statusUpdate: statusResult
      },
      summary: {
        otp: otpResult.summary,
        orderConfirmation: confirmResult.summary,
        statusUpdate: statusResult.summary
      }
    });

  } catch (error) {
    console.error('[TEST] Communication services test error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to test communication services', 
      error: error.message 
    });
  }
};

// Test Brevo email service specifically (admin only)
export const testBrevoEmailService = async (req, res) => {
  try {
    const { testEmail, testName = 'Test User' } = req.body;

    if (!testEmail) {
      return res.status(400).json({ 
        message: 'Please provide testEmail for testing.' 
      });
    }

    console.log('[TEST] Testing Brevo email service with:', { testEmail, testName });

    const results = {
      orderPlaced: null,
      orderOtp: null,
      orderDelivered: null
    };

    // Create mock order for testing
    const mockOrder = {
      _id: 'TEST-BREVO-' + Date.now(),
      totalAmount: 1299.99,
      items: [
        { name: 'Test Product 1', qty: 2, price: 599.99 },
        { name: 'Test Product 2', qty: 1, price: 100.01 }
      ],
      shipping: { 
        name: testName,
        address: 'Test Address, Test City, Test State 123456',
        phone: '+91 9876543210'
      },
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      placedAt: new Date(),
      createdAt: new Date()
    };

    // Test 1: Order Placed Email
    try {
      const orderPlacedResult = await sendOrderPlacedEmail(testEmail, testName, mockOrder);
      results.orderPlaced = { success: true, ...orderPlacedResult };
      console.log('[TEST] Order placed email sent successfully');
    } catch (error) {
      results.orderPlaced = { success: false, error: error.message };
      console.error('[TEST] Order placed email failed:', error);
    }

    // Test 2: Order OTP Email
    try {
      const testOTP = '123456';
      const otpResult = await sendOrderOtpEmail(testEmail, testName, testOTP, mockOrder._id);
      results.orderOtp = { success: true, ...otpResult };
      console.log('[TEST] Order OTP email sent successfully');
    } catch (error) {
      results.orderOtp = { success: false, error: error.message };
      console.error('[TEST] Order OTP email failed:', error);
    }

    // Test 3: Order Delivered Email
    try {
      const deliveredResult = await sendOrderDeliveredEmail(testEmail, testName, mockOrder._id);
      results.orderDelivered = { success: true, ...deliveredResult };
      console.log('[TEST] Order delivered email sent successfully');
    } catch (error) {
      results.orderDelivered = { success: false, error: error.message };
      console.error('[TEST] Order delivered email failed:', error);
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Brevo email service test completed: ${successCount}/3 emails sent successfully`,
      results,
      summary: {
        total: 3,
        successful: successCount,
        failed: 3 - successCount
      },
      mockOrder: {
        id: mockOrder._id,
        testEmail,
        testName
      }
    });

  } catch (error) {
    console.error('[TEST] Brevo email service test error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to test Brevo email service', 
      error: error.message 
    });
  }
};
