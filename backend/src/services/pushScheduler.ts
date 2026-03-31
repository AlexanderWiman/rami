import cron from 'node-cron';
import { query } from '../db';
import { sendPushNotifications } from './pushService';
import { regenerateAllSchedules } from './prayerCalculator';
import type { ExpoPushMessage } from 'expo-server-sdk';

/**
 * Minute cron: send all pending pushes whose send_at has passed.
 * Uses SELECT ... FOR UPDATE SKIP LOCKED to avoid double-sends
 * if multiple instances run (future-proofing).
 */
async function processPendingPushes(): Promise<void> {
  try {
    const result = await query(
      `UPDATE scheduled_pushes
       SET sent = true
       WHERE id IN (
         SELECT id FROM scheduled_pushes
         WHERE sent = false AND send_at <= NOW()
         ORDER BY send_at
         LIMIT 500
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, device_id, prayer_name, send_at, title, body`
    );

    if (result.rows.length === 0) return;

    // Fetch push tokens for the devices
    const deviceIds = [...new Set(result.rows.map((r: any) => r.device_id))];
    const devices = await query(
      `SELECT id, expo_push_token, platform, selected_sound, play_azan_sound
       FROM push_devices WHERE id = ANY($1)`,
      [deviceIds]
    );

    const tokenMap = new Map<string, { token: string; platform: string; selectedSound: string; playAzan: boolean }>();
    for (const d of devices.rows) {
      tokenMap.set(d.id, {
        token: d.expo_push_token,
        platform: d.platform,
        selectedSound: d.selected_sound ?? 'azan1',
        playAzan: d.play_azan_sound ?? true,
      });
    }

    const messages: ExpoPushMessage[] = [];
    for (const row of result.rows) {
      const device = tokenMap.get(row.device_id);
      if (!device) continue;

      const isCustomAzan = device.playAzan && /^azan\d+$/i.test(device.selectedSound);
      const channelId = isCustomAzan
        ? `prayer_times_high_v2_${device.selectedSound}`
        : 'prayer_times_high_v2';

      // iOS: sound file name must match the bundled .wav; Android: channel controls sound
      const sound = isCustomAzan
        ? `${device.selectedSound}_notification.wav`
        : 'default';

      messages.push({
        to: device.token,
        title: row.title,
        body: row.body || undefined,
        sound,
        priority: 'high',
        channelId: device.platform === 'android' ? channelId : undefined,
        data: {
          prayerName: row.prayer_name,
          screen: '/',
          playAzan: device.playAzan,
        },
      });
    }

    if (messages.length > 0) {
      const tickets = await sendPushNotifications(messages);
      console.log(`[pushScheduler] Sent ${messages.length} pushes, tickets: ${tickets.length}`);

      // Detect invalid tokens and remove those devices
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const msg = messages[i];
          const token = Array.isArray(msg.to) ? msg.to[0] : msg.to;
          console.log(`[pushScheduler] Removing unregistered device token: ${token}`);
          await query(`DELETE FROM push_devices WHERE expo_push_token = $1`, [token]);
        }
      }
    }
  } catch (err) {
    console.error('[pushScheduler] processPendingPushes error:', err);
  }
}

/**
 * Start the push scheduler cron jobs.
 * - Every minute: send due pushes
 * - Daily at 00:05: regenerate all schedules for 2 days ahead
 */
export function startPushScheduler(): void {
  // Every minute: process pending pushes
  cron.schedule('* * * * *', () => {
    processPendingPushes().catch((err) =>
      console.error('[pushScheduler] minute cron error:', err)
    );
  });

  // Daily at 00:05 UTC: regenerate all push schedules
  cron.schedule('5 0 * * *', () => {
    regenerateAllSchedules().catch((err) =>
      console.error('[pushScheduler] daily cron error:', err)
    );
  });

  console.log('[pushScheduler] Cron jobs started (minute + daily)');
}
