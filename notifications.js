import { Expo } from 'expo-server-sdk';

const expo = new Expo();

// Send a push notification
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  try {
    console.log(`Sending push notification to ${expoPushToken}`);
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`Invalid Expo push token: ${expoPushToken}`);
      return;
    }
    console.log(`Valid Expo push token: ${expoPushToken}`);
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };
    const receipts = await expo.sendPushNotificationsAsync([message]);
    console.log('Expo push receipts:', receipts);
    if (receipts && receipts[0] && receipts[0].status !== 'ok') {
      console.error('Expo push notification error:', receipts[0]);
    }
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}

// Send order status update to user
export async function notifyOrderStatus(user, orderId, status) {
  if (!user.pushToken) {
    console.error(`User ${user._id} has no pushToken, cannot send notification.`);
    return;
  }
  const title = `Order Update: #${orderId}`;
  const body = `Hi ${user.name}, your order #${orderId} status is now '${status}'. Tap to view details!`;
  await sendPushNotification(user.pushToken, title, body, { orderId, status });
}

// Send new order notification to all admins
export async function notifyAdminsNewOrder(admins, orderId, userName) {
  const title = `New Order Placed!`;
  const body = `Order #${orderId} placed by ${userName}. Check admin dashboard.`;
  for (const admin of admins) {
    if (admin.pushToken) {
      await sendPushNotification(admin.pushToken, title, body, { orderId });
    } else {
      console.error(`Admin ${admin._id} has no pushToken, cannot send notification.`);
    }
  }
}

// Send scheduled offer notification to all users
export async function notifyOffers(users) {
  const title = 'Special Offers Await!';
  for (const user of users) {
    if (user.pushToken) {
      const body = `Hi ${user.name}, exclusive offers are waiting for you! Open the app and grab them now.`;
      await sendPushNotification(user.pushToken, title, body, {});
    } else {
      console.error(`User ${user._id} has no pushToken, cannot send offer notification.`);
    }
  }
}
