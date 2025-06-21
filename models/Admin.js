// Admin model for admin registration and login
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  pushToken: { type: String },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
