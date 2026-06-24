/**
 * Capacitor native shell initialization (no-op on web).
 */

export async function initCapacitor() {
  if (!window.Capacitor?.isNativePlatform?.()) return

  try {
    const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
      import('@capacitor/app'),
    ])

    await StatusBar.setStyle({ style: Style.Dark })
    await SplashScreen.hide()

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        window.dispatchEvent(new CustomEvent('ironlog:foreground'))
      }
    })
  } catch (e) {
    console.warn('Capacitor init partial', e)
  }
}
