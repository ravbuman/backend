import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String,
      price: Number,
      qty: Number,
      image: String
    }
  ],
  shipping: {
    name: String,
    address: String,
    phone: String
  },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['COD', 'UPI'], default: 'COD' },
  paymentStatus: { type: String, enum: ['Pending', 'UnderReview', 'Paid'], default: 'Pending' },
  upiTransactionId: { type: String }, // UTR entered by user
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  placedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
