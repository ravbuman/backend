import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  addresses: { type: [addressSchema], default: [] },wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    variantId: { type: String }, // Store selected variant ID
    variantName: { type: String }, // Store variant name for easy access
    variantPrice: { type: Number }, // Store variant price at time of adding
    addedAt: { type: Date, default: Date.now }
  }],
  pushToken: { type: String },
}, { timestamps: true });

// Virtual for compatibility with frontend expecting userId
userSchema.virtual('userId').get(function() {
  return this._id.toString();
});
userSchema.set('toJSON', { virtuals: true });

export default mongoose.model('User', userSchema);
