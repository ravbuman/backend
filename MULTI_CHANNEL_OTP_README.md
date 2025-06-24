# Multi-Channel OTP Delivery System

This system implements robust OTP delivery verification for e-commerce orders using multiple communication channels: Email, SMS, and WhatsApp.

## Features

### 1. Multi-Channel Communication
- **Email**: Order confirmations, OTP delivery via Brevo
- **SMS**: Order confirmations, status updates, OTP delivery via BulkSMSApps
- **WhatsApp**: Order confirmations, status updates, OTP delivery via WATI

### 2. Enhanced User Model
- Added required `email` field to User model
- Registration now requires email, phone, and name
- Duplicate email validation during registration

### 3. OTP Security Features
- 6-digit numeric OTP generated for each order
- OTP sent when order status changes to "Shipped"
- OTP visible only to the user (in frontend)
- Admin must enter OTP to mark order as "Delivered"
- Security lockout after 3 failed attempts (30 minutes)
- OTP can only be used once

## Environment Variables Required

Add these to your `.env` file:

```bash
# Brevo Email Service
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Your Store Name

# BulkSMSApps SMS Service
BULKSMSAPPS_API_KEY=your_bulksmsapps_api_key
BULKSMSAPPS_SENDER_ID=your_sender_id

# WATI WhatsApp Service
WATI_API_ENDPOINT=your_wati_api_endpoint
WATI_ACCESS_TOKEN=your_wati_access_token
```

## API Endpoints

### Test Communication Services
```
POST /api/products/test/communications
Content-Type: application/json

{
  "testEmail": "test@example.com",
  "testPhone": "+1234567890",
  "testName": "Test User"
}
```

### Order Flow with OTP

1. **Order Creation**
   - Sends order confirmation via all channels
   - Generates OTP for future delivery verification

2. **Order Status: Shipped**
   - Sends OTP to user via Email, SMS, and WhatsApp
   - User can see OTP in their order details

3. **Order Status: Delivered**
   - Admin must enter the OTP to complete delivery
   - Failed attempts are tracked and locked out after 3 failures

## Integration Points

### Order Creation
```javascript
// In createOrder function
const confirmationResult = await sendOrderConfirmationNotification(user, order);
```

### Order Status Update
```javascript
// When status changes to "Shipped"
if (status === 'Shipped' && order.deliveryOtp && order.deliveryOtp.code) {
  const otpResult = await sendOTPNotification(user, order.deliveryOtp.code, order._id.toString());
}

// For all status updates
const statusResult = await sendStatusUpdateNotification(user, order._id.toString(), status);
```

## Service Architecture

### Communication Services
- `emailService.js` - Brevo email integration
- `smsService.js` - BulkSMSApps SMS integration  
- `whatsappService.js` - WATI WhatsApp integration
- `communicationService.js` - Unified service orchestrating all channels

### Error Handling
- Services run in parallel for speed
- Individual channel failures don't block order processing
- Detailed logging for debugging
- Graceful fallbacks if services are unavailable

## Testing

Use the test endpoint to verify all services are working:

```bash
curl -X POST http://localhost:5000/api/products/test/communications \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "your-email@example.com",
    "testPhone": "+1234567890",
    "testName": "Test User"
  }'
```

## Security Considerations

1. **OTP Visibility**: OTP is only shown to the user who placed the order
2. **Delivery Verification**: Only admin can mark orders as delivered using OTP
3. **Attempt Limiting**: Maximum 3 OTP validation attempts before 30-minute lockout
4. **One-Time Use**: Each OTP can only be used once
5. **Time-based Validation**: Recent failed attempts are tracked within 10-minute windows

## Frontend Integration

The frontend should:
1. Display OTP to users only when order status is "Shipped"
2. Allow admin to enter OTP when marking order as "Delivered"
3. Handle lockout scenarios with appropriate error messages
4. Show remaining attempts after failed OTP validation

## Next Steps

1. Test the complete flow end-to-end
2. Verify email templates and SMS/WhatsApp formatting
3. Monitor delivery rates and error logs
4. Add monitoring dashboards for communication service health
5. Implement webhook handlers for delivery confirmations from service providers
