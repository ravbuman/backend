import Coupon from '../models/Coupon.js';

// Create a new coupon (admin)
export const createCoupon = async (req, res) => {
  try {
    const { code, type, amount, expiry, minOrder, maxDiscount, usageLimit, active } = req.body;
    const coupon = new Coupon({ code, type, amount, expiry, minOrder, maxDiscount, usageLimit, active });
    await coupon.save();
    res.status(201).json({ coupon });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create coupon.' });
  }
};

// Get all coupons (admin)
export const getAllCoupons = async (_req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch coupons.' });
  }
};

// Validate coupon by code (public)
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const now = new Date();
    const coupon = await Coupon.findOne({ code, active: true, $or: [ { expiry: { $exists: false } }, { expiry: { $gte: now } } ] });
    if (!coupon) return res.status(404).json({ message: 'Invalid or expired coupon.' });
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ message: 'Failed to validate coupon.' });
  }
};

// Update coupon (admin)
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const coupon = await Coupon.findByIdAndUpdate(id, update, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update coupon.' });
  }
};

// Delete coupon (admin)
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete coupon.' });
  }
};
