import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  items: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String,
      price: Number,
      qty: Number,
      image: String,
      // Variant information
      variantId: String, // The variant ID from the product's variants array
      variantName: String, // e.g., "500ml", "Large", "Red"
      variantPrice: Number, // Price of the specific variant
      hasVariant: { type: Boolean, default: false } // Whether this item has a variant
    }
  ],
  shipping: {
    name: String,
    address: String,
    phone: String
  },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['COD', 'UPI'], default: 'COD' },  paymentStatus: { type: String, enum: ['Pending', 'UnderReview', 'Paid'], default: 'Pending' },
  upiTransactionId: { type: String }, // UTR entered by user
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  // OTP Delivery Verification
  deliveryOtp: {
    code: { type: String, required: true }, // 6-digit OTP code
    generatedAt: { type: Date, required: true }, // When OTP was created
    isUsed: { type: Boolean, default: false }, // Has OTP been used successfully
    failedAttempts: [{
      attemptedAt: { type: Date, required: true }, // When attempt was made
      attemptedCode: { type: String, required: true }, // What code was entered
      ipAddress: String // IP address of the attempt (for security)
    }],
    lockoutUntil: Date // When lockout expires (null if not locked)
  },
  placedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
