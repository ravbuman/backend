import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { updateOrder } from './controllers/productController.js';
import { authenticateUser } from './middleware/auth.js';
import Admin from './models/Admin.js';
import User from './models/User.js';
import * as notifications from './notifications.js';
import authRoutes from './routes/auth.js';
import couponRoutes from './routes/coupon.js';
import productRoutes from './routes/product.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);

// Add endpoint to receive and store user push tokens
app.post('/api/users/push-token', authenticateUser, async (req, res) => {
  try {
    const { token } = req.body;
    console.log(`[API] Received push token: ${token}`);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.pushToken = token;
    await user.save();
    res.json({ success: true });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to save push token.' });
  }
});

// Add endpoint to receive and store admin push tokens
app.post('/api/admins/push-token', authenticateUser, async (req, res) => {
  try {
    const { token } = req.body;

    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    admin.pushToken = token;
    await admin.save();
    res.json({ success: true });
  } catch (_err) {
    res.status(500).json({ message: 'Failed to save admin push token.' });
  }
});

// Update order (for UPI UTR or admin payment status)
app.put('/api/orders/:id', authenticateUser, updateOrder);

// Schedule offer notifications every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  try {
    const users = await User.find({ pushToken: { $exists: true, $ne: null } });
    if (users.length > 0) {
      await notifications.notifyOffers(users);
      console.log(`[CRON] Sent offer notifications to ${users.length} users.`);
    }
  } catch (err) {
    console.error('[CRON] Failed to send offer notifications:', err);
  }
});

// Root URL: Show backend info and features
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coms-Again Backend</title>
    <style>
        :root {
            --primary: #6c5ce7;
            --primary-light: #a29bfe;
            --text: #2d3436;
            --text-light: #636e72;
            --bg: #f9f9f9;
            --card-bg: #ffffff;
            --card-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
            --transition: all 0.3s ease;
            --radius: 16px;
            --success: #00b894;
            --warning: #fdcb6e;
            --error: #d63031;
        }

        [data-theme="dark"] {
            --primary: #a29bfe;
            --primary-light: #6c5ce7;
            --text: #f5f6fa;
            --text-light: #dfe6e9;
            --bg: #1e272e;
            --card-bg: #2d3436;
            --card-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            transition: var(--transition);
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 40px auto;
            background: var(--card-bg);
            border-radius: var(--radius);
            box-shadow: var(--card-shadow);
            padding: 40px;
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }

        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 8px;
            background: linear-gradient(90deg, var(--primary), var(--primary-light));
        }

        h1 {
            color: var(--primary);
            font-size: 2.5rem;
            margin-bottom: 12px;
            font-weight: 700;
        }

        .subtitle {
            color: var(--text-light);
            margin-bottom: 32px;
            font-size: 1.1rem;
            max-width: 80%;
        }

        h2 {
            color: var(--primary);
            margin: 32px 0 20px;
            font-size: 1.8rem;
            position: relative;
            display: inline-block;
        }

        h2::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 60px;
            height: 3px;
            background: var(--primary-light);
            border-radius: 3px;
        }

        ul {
            list-style: none;
        }

        li {
            margin-bottom: 16px;
            padding-left: 24px;
            position: relative;
            transition: var(--transition);
        }

        li:hover {
            transform: translateX(5px);
        }

        li::before {
            content: '→';
            position: absolute;
            left: 0;
            color: var(--primary-light);
            font-weight: bold;
        }

        b {
            color: var(--primary);
            font-weight: 600;
        }

        .footer {
            margin-top: 48px;
            color: var(--text-light);
            font-size: 0.9rem;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--card-bg);
            box-shadow: var(--card-shadow);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            transition: var(--transition);
            border: none;
            color: var(--text);
        }

        .theme-toggle:hover {
            transform: scale(1.1);
        }

        .theme-toggle:active {
            transform: scale(0.95);
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .feature-card {
            background: var(--card-bg);
            border-radius: var(--radius);
            padding: 25px;
            transition: var(--transition);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .feature-card h3 {
            color: var(--primary);
            margin-bottom: 12px;
            font-size: 1.2rem;
        }

        .feature-card p {
            color: var(--text-light);
            font-size: 0.95rem;
        }

        .highlight {
            animation: pulse 2s infinite;
            padding: 2px 8px;
            border-radius: 4px;
            background: rgba(108, 92, 231, 0.1);
        }

        @keyframes pulse {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
        }

        @media (max-width: 768px) {
            .container {
                padding: 30px 20px;
                margin: 20px auto;
            }
            
            .subtitle {
                max-width: 100%;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    </button>

    <div class="container">
        <h1>Coms-Again <span class="highlight">Backend</span></h1>
        <div class="subtitle">
            A robust, scalable backend solution powering seamless experiences across Android and Web platforms. 
            Engineered for performance with modern architecture and real-time capabilities.
        </div>

        <h2>Core Features</h2>
        <div class="feature-grid">
            <div class="feature-card">
                <h3>🔐 Authentication</h3>
                <p>Secure JWT-based auth with role management (user/admin), OAuth support, and session handling with refresh tokens.</p>
            </div>
            <div class="feature-card">
                <h3>📦 Product Engine</h3>
                <p>Full CRUD operations with image processing, inventory tracking, rich search, and review analytics.</p>
            </div>
            <div class="feature-card">
                <h3>💰 Order System</h3>
                <p>End-to-end order processing with status tracking, payment gateway integration, and admin controls.</p>
            </div>
            <div class="feature-card">
                <h3>🛒 Cart & Wishlist</h3>
                <p>Persistent user collections with real-time sync across devices and abandonment analytics.</p>
            </div>
            <div class="feature-card">
                <h3>🎟️ Promotions</h3>
                <p>Flexible coupon system with validation rules, usage limits, and campaign management.</p>
            </div>
            <div class="feature-card">
                <h3>🔔 Notifications</h3>
                <p>Real-time push notifications with Firebase Cloud Messaging and scheduled campaigns.</p>
            </div>
        </div>

        <h2>Technical Highlights</h2>
        <ul>
            <li><b>RESTful API</b> - Clean, documented endpoints with versioning support for Android and Web clients</li>
            <li><b>Admin Dashboard</b> - Comprehensive analytics and management interface with real-time monitoring</li>
            <li><b>Automated Tasks</b> - Scheduled jobs for offer notifications, database maintenance, and report generation</li>
            <li><b>Performance Optimized</b> - Caching, query optimization, and load balancing for high traffic scenarios</li>
            <li><b>Secure Architecture</b> - Rate limiting, input sanitization, and regular security audits</li>
        </ul>

        <div class="footer">
            &copy; 2025 Coms-Again. All rights reserved. | v2.8.1
        </div>
    </div>

    <script>
        // Theme toggle functionality
        const themeToggle = document.getElementById('themeToggle');
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        const currentTheme = localStorage.getItem('theme');
        
        // Set initial theme
        if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');

        }
        
        // Toggle theme
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');

            }
        });
        
        // Add animation to feature cards on scroll
        const featureCards = document.querySelectorAll('.feature-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        featureCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
