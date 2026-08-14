import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { connectRealtime, disconnectRealtime, userChannelName } from '@/services/realtime'

export function useRealtime() {
  const queryClient = useQueryClient()
  const { isAuthenticated, token, user } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) return

    const echo = connectRealtime(token)

    const invalidateNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    }

    const userChannel = echo.private(userChannelName(user.id))
    userChannel.listen('.notification.created', invalidateNotifications)

    return () => {
      userChannel.stopListening('.notification.created')
      disconnectRealtime()
    }
  }, [isAuthenticated, token, user?.id, queryClient])
}
