import express from 'express';
import multer from 'multer';
import * as productController from '../controllers/productController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const upload = multer();

// Product CRUD (admin)
router.post('/', upload.array('images', 5), productController.createProduct);
router.put('/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Product listing/detail (public)
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Reviews (user)
router.post('/:id/reviews', authenticateUser, productController.addOrUpdateReview);
router.get('/:id/reviews', productController.getReviews);

// Orders
router.post('/orders', authenticateUser, productController.createOrder);
router.get('/orders/user', authenticateUser, productController.getUserOrders);
router.get('/orders/all', productController.getAllOrders); // make public for now
router.put('/orders/:id/status', productController.updateOrderStatus); // make public for now
router.post('/orders/:id/cancel', authenticateUser, productController.cancelOrder);
router.get('/orders/:id', authenticateUser, productController.getOrderById); // New endpoint for authenticated users to fetch their own order by ID
// Mark order as paid (admin)
router.post('/orders/:id/mark-paid', productController.markOrderAsPaid);

// Wishlist
router.get('/wishlist/me', authenticateUser, productController.getWishlistByUserId);
router.post('/wishlist/add', authenticateUser, productController.addToWishlist);
router.post('/wishlist/remove', authenticateUser, productController.removeFromWishlist);
router.post('/wishlist/clear', authenticateUser, productController.clearWishlist);

// Cart
router.get('/cart/me', authenticateUser, productController.getCart);
router.post('/cart/add', authenticateUser, productController.addToCart);
router.delete('/cart/remove', authenticateUser, productController.removeFromCart);
router.put('/cart/update', authenticateUser, productController.updateCartItem);
router.post('/cart/clear', authenticateUser, productController.clearCart);

// Admin: get all users
router.get('/users/all', productController.getAllUsers); // admin only in production
// Admin: get all orders for a user
router.get('/orders/user/:userId', productController.getOrdersByUserId); // admin only in production

// Test communication services (admin only)
router.post('/test/communications', productController.testCommunicationServices);
// Test Brevo email service specifically (admin only)
router.post('/test/brevo-emails', productController.testBrevoEmailService);

export default router;
