import mongoose from 'mongoose';
import Product from './models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleProducts = [
  {
    name: "Premium Water Bottle",
    description: "High-quality stainless steel water bottle available in multiple sizes",
    price: 299, // Base price (will be overridden by variants)
    originalPrice: 399,
    category: "Water Bottles",
    stock: 0, // Base stock (will be calculated from variants)
    images: ["https://picsum.photos/400/400?random=1"],
    hasVariants: true,
    variants: [
      {
        id: "500ml",
        name: "500ml",
        label: "500ml - Half Litre",
        price: 299,
        originalPrice: 399,
        stock: 25,
        sku: "WB-500ML",
        isDefault: true
      },
      {
        id: "750ml",
        name: "750ml", 
        label: "750ml - Three Quarter Litre",
        price: 399,
        originalPrice: 499,
        stock: 20,
        sku: "WB-750ML",
        isDefault: false
      },
      {
        id: "1l",
        name: "1L",
        label: "1L - One Litre", 
        price: 499,
        originalPrice: 599,
        stock: 15,
        sku: "WB-1L",
        isDefault: false
      }
    ]
  },
  {
    name: "Organic Coffee Beans",
    description: "Premium organic coffee beans from the highlands",
    price: 599,
    originalPrice: 799,
    category: "Coffee",
    stock: 0,
    images: ["https://picsum.photos/400/400?random=2"],
    hasVariants: true,
    variants: [
      {
        id: "250g",
        name: "250g",
        label: "250g - Quarter Kg",
        price: 599,
        originalPrice: 799,
        stock: 30,
        sku: "CB-250G",
        isDefault: true
      },
      {
        id: "500g",
        name: "500g",
        label: "500g - Half Kg",
        price: 999,
        originalPrice: 1299,
        stock: 20,
        sku: "CB-500G",
        isDefault: false
      },
      {
        id: "1kg",
        name: "1kg",
        label: "1kg - One Kg",
        price: 1799,
        originalPrice: 2399,
        stock: 10,
        sku: "CB-1KG",
        isDefault: false
      }
    ]
  },
  {
    name: "Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 2999,
    originalPrice: 3999,
    category: "Electronics",
    stock: 50,
    images: ["https://picsum.photos/400/400?random=3"],
    hasVariants: false, // Regular product without variants
    reviews: [
      {
        user: "John Doe",
        rating: 5,
        comment: "Excellent sound quality!",
        date: new Date()
      },
      {
        user: "Jane Smith", 
        rating: 4,
        comment: "Good value for money",
        date: new Date()
      }
    ]
  },
  {
    name: "Smartphone Case",
    description: "Protective smartphone case available in different colors",
    price: 299,
    category: "Accessories",
    stock: 0,
    images: ["https://picsum.photos/400/400?random=4"],
    hasVariants: true,
    variants: [
      {
        id: "black",
        name: "Black",
        label: "Black - Classic",
        price: 299,
        stock: 25,
        sku: "PC-BLACK",
        isDefault: true
      },
      {
        id: "blue",
        name: "Blue", 
        label: "Blue - Ocean",
        price: 299,
        stock: 20,
        sku: "PC-BLUE",
        isDefault: false
      },
      {
        id: "red",
        name: "Red",
        label: "Red - Passion",
        price: 349,
        originalPrice: 399,
        stock: 15,
        sku: "PC-RED",
        isDefault: false
      }
    ]
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://ravi:RaPy2025@ravipydah.wnmy712.mongodb.net/android-ravi?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`Inserted ${products.length} sample products`);
    
    // Log the created products
    products.forEach(product => {
      console.log(`- ${product.name} (${product.hasVariants ? 'with variants' : 'no variants'})`);
      if (product.hasVariants) {
        product.variants.forEach(variant => {
          console.log(`  • ${variant.label}: ₹${variant.price} (${variant.stock} in stock)`);
        });
      }
    });

    console.log('\n✅ Sample products created successfully!');
    console.log('You can now test the variant functionality in your frontend.');
    
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedProducts();
