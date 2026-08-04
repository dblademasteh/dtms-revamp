import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echo: Echo<'reverb'> | null = null

function resolveConfig() {
  const scheme = import.meta.env.VITE_REVERB_SCHEME || (window.location.protocol === 'https:' ? 'https' : 'http')
  const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname
  const port = import.meta.env.VITE_REVERB_PORT || window.location.port || (scheme === 'https' ? '443' : '80')

  return {
    key: import.meta.env.VITE_REVERB_APP_KEY || 'dts-reverb-key',
    scheme,
    host,
    port,
    path: import.meta.env.VITE_REVERB_PATH || '',
  }
}

export function connectRealtime(token: string): Echo<'reverb'> {
  if (echo) {
    echo.disconnect()
  }

  const { key, scheme, host, port, path } = resolveConfig()

  echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wsPath: path,
    scheme,
    forceTLS: scheme === 'https',
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: { Authorization: `Bearer ${token}` },
    },
    Pusher,
  })

  return echo
}

export function getEcho(): Echo<'reverb'> | null {
  return echo
}

export function disconnectRealtime(): void {
  if (echo) {
    echo.disconnect()
    echo = null
  }
}

export function userChannelName(userId: number): string {
  return `App.Models.User.${userId}`
}
