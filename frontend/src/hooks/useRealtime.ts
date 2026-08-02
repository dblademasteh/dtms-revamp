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

    const invalidateDocuments = () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports-volume'] })
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      queryClient.invalidateQueries({ queryKey: ['announcements-all'] })
      queryClient.invalidateQueries({ queryKey: ['track'] })
      queryClient.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === 'string' && String(query.queryKey[0]).startsWith('report'),
      })
    }

    const userChannel = echo.private(userChannelName(user.id))
    userChannel.listen('.notification.created', invalidateNotifications)

    const documentsChannel = echo.channel('documents')
    documentsChannel.listen('.status.changed', invalidateDocuments)

    return () => {
      userChannel.stopListening('.notification.created')
      documentsChannel.stopListening('.status.changed')
      disconnectRealtime()
    }
  }, [isAuthenticated, token, user?.id, queryClient])
}
