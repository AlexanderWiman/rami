import { Router, Request, Response } from 'express';
import { query } from '../db';
import { sendTestPush } from '../services/pushService';
import {
  regenerateScheduleForDevice,
  type PushDeviceRow,
} from '../services/prayerCalculator';

const router = Router();

// ── POST /register ──
// Upsert device: token, location, prefs, timezone, language, platform.
// Triggers schedule regeneration.
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      deviceId,
      expoPushToken,
      platform,
      timezone,
      latitude,
      longitude,
      calculationMethod,
      asrMethod,
      highLatitudeRule,
      prayerOffsets,
      prayerNotify,
      notificationsEnabled,
      language,
      selectedSound,
      playAzanSound,
    } = req.body;

    if (!deviceId || !expoPushToken || !platform) {
      return res.status(400).json({ error: 'deviceId, expoPushToken, and platform are required' });
    }

    const result = await query(
      `INSERT INTO push_devices (
        device_id, expo_push_token, platform, timezone,
        latitude, longitude, calculation_method, asr_method, high_latitude_rule,
        prayer_offsets, prayer_notify, notifications_enabled, language,
        selected_sound, play_azan_sound
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (device_id) DO UPDATE SET
        expo_push_token = EXCLUDED.expo_push_token,
        platform = EXCLUDED.platform,
        timezone = COALESCE(EXCLUDED.timezone, push_devices.timezone),
        latitude = COALESCE(EXCLUDED.latitude, push_devices.latitude),
        longitude = COALESCE(EXCLUDED.longitude, push_devices.longitude),
        calculation_method = COALESCE(EXCLUDED.calculation_method, push_devices.calculation_method),
        asr_method = COALESCE(EXCLUDED.asr_method, push_devices.asr_method),
        high_latitude_rule = COALESCE(EXCLUDED.high_latitude_rule, push_devices.high_latitude_rule),
        prayer_offsets = COALESCE(EXCLUDED.prayer_offsets, push_devices.prayer_offsets),
        prayer_notify = COALESCE(EXCLUDED.prayer_notify, push_devices.prayer_notify),
        notifications_enabled = COALESCE(EXCLUDED.notifications_enabled, push_devices.notifications_enabled),
        language = COALESCE(EXCLUDED.language, push_devices.language),
        selected_sound = COALESCE(EXCLUDED.selected_sound, push_devices.selected_sound),
        play_azan_sound = COALESCE(EXCLUDED.play_azan_sound, push_devices.play_azan_sound),
        updated_at = NOW()
      RETURNING *`,
      [
        deviceId,
        expoPushToken,
        platform,
        timezone ?? 'UTC',
        latitude ?? null,
        longitude ?? null,
        calculationMethod ?? 'Diyanet',
        asrMethod ?? 'Shafi',
        highLatitudeRule ?? 'MiddleOfNight',
        prayerOffsets ? JSON.stringify(prayerOffsets) : null,
        prayerNotify ? JSON.stringify(prayerNotify) : null,
        notificationsEnabled ?? true,
        language ?? 'ar',
        selectedSound ?? 'azan1',
        playAzanSound ?? true,
      ]
    );

    const device = result.rows[0] as PushDeviceRow;

    // Regenerate push schedule in background (don't block response)
    regenerateScheduleForDevice(device).catch((err) =>
      console.error('[push/register] schedule regeneration failed:', err)
    );

    res.json({ ok: true, deviceId: device.device_id });
  } catch (err) {
    console.error('[push/register] error:', err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// ── POST /unregister ──
// Remove device and all its scheduled pushes (CASCADE).
router.post('/unregister', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    await query(`DELETE FROM push_devices WHERE device_id = $1`, [deviceId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[push/unregister] error:', err);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

// ── PUT /preferences ──
// Update notification preferences for a device. Triggers schedule regeneration.
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const {
      deviceId,
      timezone,
      latitude,
      longitude,
      calculationMethod,
      asrMethod,
      highLatitudeRule,
      prayerOffsets,
      prayerNotify,
      notificationsEnabled,
      language,
      selectedSound,
      playAzanSound,
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let idx = 1;

    function addField(col: string, val: any, jsonStringify = false) {
      if (val !== undefined && val !== null) {
        setClauses.push(`${col} = $${idx}`);
        values.push(jsonStringify ? JSON.stringify(val) : val);
        idx++;
      }
    }

    addField('timezone', timezone);
    addField('latitude', latitude);
    addField('longitude', longitude);
    addField('calculation_method', calculationMethod);
    addField('asr_method', asrMethod);
    addField('high_latitude_rule', highLatitudeRule);
    addField('prayer_offsets', prayerOffsets, true);
    addField('prayer_notify', prayerNotify, true);
    addField('notifications_enabled', notificationsEnabled);
    addField('language', language);
    addField('selected_sound', selectedSound);
    addField('play_azan_sound', playAzanSound);

    values.push(deviceId);
    const result = await query(
      `UPDATE push_devices SET ${setClauses.join(', ')} WHERE device_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const device = result.rows[0] as PushDeviceRow;

    regenerateScheduleForDevice(device).catch((err) =>
      console.error('[push/preferences] schedule regeneration failed:', err)
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[push/preferences] error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ── POST /test ──
// Send a test push notification immediately.
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const result = await query(
      `SELECT expo_push_token, language FROM push_devices WHERE device_id = $1`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found. Register first.' });
    }

    const { expo_push_token, language } = result.rows[0];
    const titles: Record<string, string> = {
      en: 'Test notification',
      ar: 'إشعار تجريبي',
      tr: 'Test bildirimi',
      fr: 'Notification test',
      es: 'Notificación de prueba',
      sv: 'Testnotis',
      de: 'Testbenachrichtigung',
    };

    const bodies: Record<string, string> = {
      en: 'Push notifications are working!',
      ar: 'الإشعارات تعمل بنجاح!',
      tr: 'Push bildirimleri çalışıyor!',
      fr: 'Les notifications push fonctionnent !',
      es: '¡Las notificaciones push funcionan!',
      sv: 'Push-notiser fungerar!',
      de: 'Push-Benachrichtigungen funktionieren!',
    };

    const tickets = await sendTestPush(
      expo_push_token,
      titles[language] ?? titles.en,
      bodies[language] ?? bodies.en
    );

    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('[push/test] error:', err);
    res.status(500).json({ error: 'Failed to send test push' });
  }
});

export default router;
