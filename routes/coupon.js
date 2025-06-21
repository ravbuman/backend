import express from 'express';
import * as couponController from '../controllers/couponController.js';

const router = express.Router();

// Admin endpoints
router.post('/', couponController.createCoupon); // TODO: add admin auth
router.get('/', couponController.getAllCoupons); // TODO: add admin auth
router.put('/:id', couponController.updateCoupon); // TODO: add admin auth
router.delete('/:id', couponController.deleteCoupon); // TODO: add admin auth

// Public
router.post('/validate', couponController.validateCoupon);

export default router;
