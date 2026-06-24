/**
 * Post-v1: Goal Guardian push notifications via FCM/APNs.
 */

export async function registerPushNotifications(_userId) {
  if (!window.Capacitor?.isNativePlatform?.()) {
    return { registered: false, reason: 'web' }
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') {
      return { registered: false, reason: 'denied' }
    }
    await PushNotifications.register()
    return { registered: true }
  } catch (e) {
    return { registered: false, reason: e.message }
  }
}

export async function scheduleGuardianReminder(_payload) {
  return { scheduled: false, reason: 'server-side scheduling post-v1' }
}
