import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // Base/fallback price
  originalPrice: { type: Number }, // Base original price for discounts
  category: { type: String, required: true },
  stock: { type: Number, required: true }, // Base/fallback stock
  images: [String], // S3 URLs - base product images
  
  // Variant system
  hasVariants: { type: Boolean, default: false },
  variants: [{
    id: { type: String, required: true }, // "500ml", "1l", "2l"
    name: { type: String, required: true }, // "500ml", "1L", "2L" 
    label: { type: String, required: true }, // "Half Litre", "1 Litre", "2 Litre"
    price: { type: Number, required: true },
    originalPrice: { type: Number }, // For individual variant discounts
    stock: { type: Number, required: true, default: 0 },
    sku: { type: String }, // Unique SKU for variant
    isDefault: { type: Boolean, default: false }, // Default/cheapest variant
    images: [String] // Optional variant-specific images
  }],
  
  reviews: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      user: String, // Store user name for easier access
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, required: true },
      date: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
