/**
 * Capacitor native shell — splash, status bar, foreground sync, network events.
 */

export async function initCapacitor() {
  if (!window.Capacitor?.isNativePlatform?.()) return

  try {
    const [{ SplashScreen }, { StatusBar, Style }, { App }, { Network }] = await Promise.all([
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
      import('@capacitor/app'),
      import('@capacitor/network'),
    ])

    await StatusBar.setStyle({ style: Style.Dark })
    await SplashScreen.hide()

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        window.dispatchEvent(new CustomEvent('ironlog:foreground'))
      }
    })

    const status = await Network.getStatus()
    window.dispatchEvent(
      new CustomEvent('ironlog:network', { detail: { connected: status.connected } })
    )

    Network.addListener('networkStatusChange', (s) => {
      window.dispatchEvent(
        new CustomEvent('ironlog:network', { detail: { connected: s.connected } })
      )
    })
  } catch (e) {
    console.warn('Capacitor init partial', e)
  }
}
