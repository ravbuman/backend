# API Endpoints Documentation

## Authentication (`/api/auth`)

### Register User
- **POST** `/api/auth/register`
- **Description:** Register a new user.
- **Input:**  
   json
  {
    "username": "string",
    "password": "string",
    "name": "string",
    "phone": "string"
  }
   
- **Output:**  
   json
  {
    "token": "string",
    "user": {
      "userId": "string",
      "username": "string",
      "name": "string",
      "phone": "string",
      "addresses": []
    }
  }
   
- **Role:** Public

 

### User Login
- **POST** `/api/auth/login`
- **Description:** Login as a user.
- **Input:**  
   json
  {
    "username": "string",
    "password": "string"
  }
   
- **Output:**  
   json
  {
    "token": "string",
    "user": {
      "userId": "string",
      "username": "string",
      "name": "string",
      "phone": "string",
      "addresses": [],
      "isAdmin": false
    }
  }
   
- **Role:** Public

 

### Register Admin
- **POST** `/api/auth/admin/register`
- **Description:** Register a new admin.
- **Input:**  
   json
  {
    "username": "string",
    "password": "string",
    "name": "string",
    "email": "string"
  }
   
- **Output:**  
   json
  {
    "token": "string",
    "admin": {
      "adminId": "string",
      "username": "string",
      "name": "string",
      "email": "string",
      "isAdmin": true
    }
  }
   
- **Role:** Public

 

### Admin Login
- **POST** `/api/auth/admin/login`
- **Description:** Login as an admin.
- **Input:**  
   json
  {
    "username": "string",
    "password": "string"
  }
   
- **Output:**  
   json
  {
    "token": "string",
    "admin": {
      "adminId": "string",
      "username": "string",
      "name": "string",
      "email": "string",
      "isAdmin": true
    }
  }
   
- **Role:** Public

 

### Get Current User
- **GET** `/api/auth/me`
- **Description:** Get current user profile (requires JWT).
- **Headers:** `Authorization: Bearer <token>`
- **Output:**  
   json
  {
    "user": {
      "userId": "string",
      "username": "string",
      "name": "string",
      "phone": "string",
      "addresses": []
    }
  }
   
- **Role:** User

 

### Update User Profile
- **PUT** `/api/auth/me`
- **Description:** Update user profile (requires JWT).
- **Headers:** `Authorization: Bearer <token>`
- **Input:**  
   json
  {
    "name": "string (optional)",
    "phone": "string (optional)",
    "addresses": [ { "name": "string", "address": "string", "phone": "string" } ] (optional)
  }
   
- **Output:**  
   json
  {
    "user": {
      "userId": "string",
      "username": "string",
      "name": "string",
      "phone": "string",
      "addresses": []
    }
  }
   
- **Role:** User

 

### Add User Address
- **POST** `/api/auth/address/add`
- **Description:** Add a new address to user profile.
- **Headers:** `Authorization: Bearer <token>`
- **Input:**  
   json
  {
    "name": "string",
    "address": "string",
    "phone": "string"
  }
   
- **Output:**  
   json
  {
    "addresses": [ { "name": "string", "address": "string", "phone": "string" } ]
  }
   
- **Role:** User

 

## Coupon Management (`/api/coupons`)

> **Note:** Admin endpoints should be protected with admin authentication (TODO in code).

### Create Coupon
- **POST** `/api/coupons/`
- **Description:** Create a new coupon.
- **Input:**  
   json
  {
    "code": "string",
    "type": "percent|flat",
    "amount": number,
    "expiry": "date (optional)",
    "minOrder": number (optional),
    "maxDiscount": number (optional),
    "usageLimit": number (optional),
    "active": boolean (optional)
  }
   
- **Output:**  
   json
  {
    "coupon": { ...coupon fields... }
  }
   
- **Role:** Admin

 

### Get All Coupons
- **GET** `/api/coupons/`
- **Description:** Get all coupons.
- **Output:**  
   json
  {
    "coupons": [ { ...coupon fields... } ]
  }
   
- **Role:** Admin

 

### Update Coupon
- **PUT** `/api/coupons/:id`
- **Description:** Update a coupon by ID.
- **Input:**  
   json
  {
    // Any coupon fields to update
  }
   
- **Output:**  
   json
  {
    "coupon": { ...coupon fields... }
  }
   
- **Role:** Admin

 

### Delete Coupon
- **DELETE** `/api/coupons/:id`
- **Description:** Delete a coupon by ID.
- **Output:**  
   json
  {
    "message": "Coupon deleted."
  }
   
- **Role:** Admin

 

### Validate Coupon
- **POST** `/api/coupons/validate`
- **Description:** Validate a coupon code.
- **Input:**  
   json
  {
    "code": "string"
  }
   
- **Output:**  
   json
  {
    "coupon": { ...coupon fields... }
  }
   
- **Role:** Public

 

## Product, Order, Cart, Wishlist (`/api/products`)

### Product CRUD (Admin)
- **POST** `/api/products/`  
  Create product.  
  **Input:** FormData (fields: name, description, price, category, stock, images[])  
  **Output:**  
   json
  { "product": { ...product fields... } }
   
  **Role:** Admin

- **PUT** `/api/products/:id`  
  Update product.  
  **Input:** FormData (fields as above)  
  **Output:**  
   json
  { "product": { ...product fields... } }
   
  **Role:** Admin

- **DELETE** `/api/products/:id`  
  Delete product.  
  **Output:**  
   json
  { "message": "Product deleted." }
   
  **Role:** Admin

 

### Product Listing/Detail (Public)
- **GET** `/api/products/`  
  List all products.  
  **Output:**  
   json
  { "products": [ { ...product fields... } ] }
   
  **Role:** Public

- **GET** `/api/products/:id`  
  Get product by ID.  
  **Output:**  
   json
  { "product": { ...product fields... } }
   
  **Role:** Public

 

### Product Reviews (User)
- **POST** `/api/products/:id/reviews`  
  Add/update review.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "rating": number, "comment": "string" }
   
  **Output:**  
   json
  { "reviews": [ ... ] }
   
  **Role:** User

- **GET** `/api/products/:id/reviews`  
  Get reviews for product.  
  **Output:**  
   json
  { "reviews": [ ... ] }
   
  **Role:** Public

 

### Orders

- **POST** `/api/products/orders`  
  Create order.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  {
    "items": [ ... ],
    "shipping": { "name": "string", "address": "string", "phone": "string" },
    "totalAmount": number,
    "paymentMethod": "COD|UPI",
    "coupon": "couponId (optional)"
  }
   
  **Output:**  
   json
  { "order": { ...order fields... } }
   
  **Role:** User

- **GET** `/api/products/orders/user`  
  Get orders for current user.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "orders": [ ... ] }
   
  **Role:** User

- **GET** `/api/products/orders/all`  
  Get all orders.  
  **Output:**  
   json
  { "orders": [ ... ] }
   
  **Role:** Admin (currently public, should be admin only)

- **PUT** `/api/products/orders/:id/status`  
  Update order status.  
  **Input:**  
   json
  { "status": "Pending|Shipped|Delivered|Cancelled|Paid" }
   
  **Output:**  
   json
  { "order": { ...order fields... } }
   
  **Role:** Admin (currently public, should be admin only)

- **POST** `/api/products/orders/:id/cancel`  
  Cancel order.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "order": { ...order fields... } }
   
  **Role:** User

- **GET** `/api/products/orders/:id`  
  Get order by ID.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "order": { ...order fields... }, "user": { ... } (if admin) }
   
  **Role:** User/Admin

- **POST** `/api/products/orders/:id/mark-paid`  
  Mark order as paid.  
  **Output:**  
   json
  { "success": true, "order": { ...order fields... } }
   
  **Role:** Admin

 

### Wishlist (User)
- **GET** `/api/products/wishlist/me`  
  Get current user's wishlist.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "wishlist": [ ... ] }
   
  **Role:** User

- **POST** `/api/products/wishlist/add`  
  Add product to wishlist.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "productId": "string" }
   
  **Output:**  
   json
  { "wishlist": [ ... ] }
   
  **Role:** User

- **POST** `/api/products/wishlist/remove`  
  Remove product from wishlist.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "productId": "string" }
   
  **Output:**  
   json
  { "wishlist": [ ... ] }
   
  **Role:** User

- **POST** `/api/products/wishlist/clear`  
  Clear wishlist.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "wishlist": [] }
   
  **Role:** User

 

### Cart (User)
- **GET** `/api/products/cart/me`  
  Get current user's cart.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "cart": [ ... ] }
   
  **Role:** User

- **POST** `/api/products/cart/add`  
  Add product to cart.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "productId": "string", "quantity": number }
   
  **Output:**  
   json
  { "cart": [ ... ] }
   
  **Role:** User

- **POST** `/api/products/cart/remove`  
  Remove product from cart.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "productId": "string" }
   
  **Output:**  
   json
  { "cart": [ ... ] }
   
  **Role:** User

- **POST** `/api/products/cart/clear`  
  Clear cart.  
  **Headers:** `Authorization: Bearer <token>`  
  **Output:**  
   json
  { "cart": [] }
   
  **Role:** User

- **POST** `/api/products/cart/update`  
  Update cart item quantity.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "productId": "string", "qty": number }
   
  **Output:**  
   json
  { "cart": [ ... ] }
   
  **Role:** User

 

### Admin: Get All Users
- **GET** `/api/products/users/all`  
  Get all users.  
  **Output:**  
   json
  { "users": [ ... ] }
   
  **Role:** Admin

 

### Admin: Get All Orders for a User
- **GET** `/api/products/orders/user/:userId`  
  Get all orders for a specific user.  
  **Output:**  
   json
  { "orders": [ ... ] }
   
  **Role:** Admin

 

## Push Token Endpoints

- **POST** `/api/users/push-token`  
  Save user push token.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "token": "string" }
   
  **Output:**  
   json
  { "success": true }
   
  **Role:** User

- **POST** `/api/admins/push-token`  
  Save admin push token.  
  **Headers:** `Authorization: Bearer <token>`  
  **Input:**  
   json
  { "token": "string" }
   
  **Output:**  
   json
  { "success": true }
   
  **Role:** Admin

 

## Notes

- All endpoints requiring authentication expect a JWT in the `Authorization` header.
- Some admin endpoints are currently public (see code comments) and should be protected in production.
- Data structures for products, orders, users, coupons, etc., follow the Mongoose models in your backend.

 
