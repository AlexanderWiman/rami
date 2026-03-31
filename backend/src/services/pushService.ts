import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Send push notifications in batches via Expo Push API.
 * Returns tickets for tracking delivery (callers may log/ignore).
 */
export async function sendPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  const valid = messages.filter((m) => {
    const token = Array.isArray(m.to) ? m.to[0] : m.to;
    if (!token || !Expo.isExpoPushToken(token)) {
      console.warn(`Invalid Expo push token: ${token}`);
      return false;
    }
    return true;
  });

  if (valid.length === 0) return [];

  const chunks = expo.chunkPushNotifications(valid);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const result = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...result);
    } catch (err) {
      console.error('Expo push send error:', err);
    }
  }

  return tickets;
}

/** Send a single test notification immediately. */
export async function sendTestPush(
  expoPushToken: string,
  title: string,
  body: string
): Promise<ExpoPushTicket[]> {
  return sendPushNotifications([
    {
      to: expoPushToken,
      title,
      body,
      sound: 'default',
      priority: 'high',
    },
  ]);
}
