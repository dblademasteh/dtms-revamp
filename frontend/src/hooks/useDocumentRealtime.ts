import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { connectRealtime, disconnectRealtime, getEcho, documentChannelName } from '@/services/realtime'

export function useDocumentRealtime(documentId?: number | string) {
  const queryClient = useQueryClient()
  const { isAuthenticated, token } = useAuthStore()

  useEffect(() => {
    const id = Number(documentId)
    if (!isAuthenticated || !token || !id || Number.isNaN(id)) return

    const existing = getEcho()
    const echo = existing ?? connectRealtime(token)

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['document'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    }

    const channel = echo.private(documentChannelName(id))
    channel.listen('.status.changed', invalidate)

    return () => {
      channel.stopListening('.status.changed')
      if (!existing) {
        disconnectRealtime()
      }
    }
  }, [isAuthenticated, token, documentId, queryClient])
}
