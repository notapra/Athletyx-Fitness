/**
 * Native haptic feedback — no-op on web.
 */

function isNative() {
  return Boolean(window.Capacitor?.isNativePlatform?.())
}

export async function hapticLight() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* unavailable */
  }
}

export async function hapticMedium() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    /* unavailable */
  }
}

export async function hapticSuccess() {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    /* unavailable */
  }
}
