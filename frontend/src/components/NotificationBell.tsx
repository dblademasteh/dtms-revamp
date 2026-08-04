import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Bell, Check, X, Trash2, MailX } from 'lucide-react'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then(res => res.data),
    refetchInterval: 30000,
  })

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(res => res.data),
    enabled: open,
  })

  const readMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/clear-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const unreadCount = unreadData?.count || 0
  const notifications = notificationsData?.data || []

  const getNotificationText = (n: any) => {
    const tracking = n.data?.tracking_number ? ` (${n.data.tracking_number})` : ''
    switch (n.type) {
      case 'document_disseminated':
        return {
          title: n.title || 'New Announcement',
          message: n.message || `A new announcement was posted: "${n.data?.subject || 'View details'}"`,
        }
      case 'document_created':
        return {
          title: 'New Document Received',
          message: `A new document "${n.data?.subject ?? n.message}"${tracking} was routed to you and needs your attention. Open it to view details and take action.`,
        }
      case 'document_approved':
        return {
          title: 'Document Approved',
          message: `The document "${n.data?.subject ?? n.message}"${tracking} you sent has been approved. You can track its progress.`,
        }
      case 'document_forwarded':
        return {
          title: 'Document Forwarded',
          message: `The document "${n.data?.subject ?? n.message}"${tracking} was forwarded to you for review. Open it to view details and take action.`,
        }
      case 'document_returned':
        return {
          title: 'Document Returned',
          message: `The document "${n.data?.subject ?? n.message}"${tracking} was returned to you with remarks. Please review and resubmit if needed.`,
        }
        case 'document_rejected':
          return {
            title: 'Document Declined',
            message: `The document "${n.data?.subject ?? n.message}"${tracking} you sent was declined. Open it to see the reason.`,
          }
        default:
          return { title: n.title || 'Update', message: n.message || '' }
    }
  }

  const audioContextRef = useRef<AudioContext | null>(null)

  // Pre-unlock AudioContext on user gesture
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass()
        }
      }
      const ctx = audioContextRef.current
      if (ctx && ctx.state === 'suspended') {
        ctx.resume()
      }
    }
    window.addEventListener('click', initAudio, { once: true })
    window.addEventListener('touchstart', initAudio, { once: true })
    return () => {
      window.removeEventListener('click', initAudio)
      window.removeEventListener('touchstart', initAudio)
    }
  }, [])

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      // Create context if not already created by user gesture
      const ctx = audioContextRef.current || new AudioContextClass()
      audioContextRef.current = ctx

      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Schedule rapid bell strikes over 3 seconds (simulating a physical alarm bell)
      const now = ctx.currentTime
      const playStrike = (startTime: number) => {
        // Multi-frequency resonance for a metallic bell-like timbre
        const freqs = [987.77, 1318.51, 1975.53] // B5, E6, B6 harmonic structure
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, startTime)

          // Metallic attack and quick decay
          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.04, startTime + 0.005)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.12)
        })
      }

      // Strike the bell 24 times rapidly (8 strikes/sec for ~3 seconds)
      for (let i = 0; i < 24; i++) {
        playStrike(now + i * 0.125)
      }
    } catch (e) {
      console.warn('AudioContext failed to play sound:', e)
    }
  }

  // Request browser Notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Play ringing sound on loop every 5 seconds if there are unread notifications
  useEffect(() => {
    if (unreadCount === 0) return

    // Play immediately on arrival
    playNotificationSound()

    // Loop every 5 seconds
    const interval = setInterval(() => {
      playNotificationSound()
    }, 5000)

    return () => clearInterval(interval)
  }, [unreadCount])

  // Trigger native browser push notification when unreadCount increases
  const prevCountRef = useRef(unreadCount)
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      api.get('/notifications', { params: { per_page: 1 } })
        .then((res) => {
          const latest = res.data?.data?.[0]
          if (latest && 'Notification' in window && Notification.permission === 'granted') {
            const text = getNotificationText(latest)
            new Notification(text.title, {
              body: text.message,
              icon: '/logo.png',
            })
          }
        })
        .catch(() => {})
    }
    prevCountRef.current = unreadCount
  }, [unreadCount])

  return (
    <div className="relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(10deg); }
          20%, 40%, 60%, 80% { transform: rotate(-10deg); }
        }
        .animate-bell-ring {
          animation: bell-ring 1s ease-in-out infinite;
          transform-origin: top center;
        }
      `}} />
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'animate-bell-ring text-blue-600' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[24rem] bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAllMutation.mutate()}
                    className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <MailX className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">All caught up!</p>
                  <p className="text-xs text-slate-500 mt-1">No message notification right now.</p>
                </div>
              ) : (
                notifications.map((n: any) => {
                  const text = getNotificationText(n)
                  return (
                    <div
                      key={n.id}
                      className={`px-5 py-4 border-b border-slate-50 hover:bg-slate-50/80 transition-all ${
                        !n.is_read ? 'bg-primary-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{text.title}</p>
                          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{text.message}</p>
                          <p className="text-xs text-slate-400 mt-2 font-medium">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => readMutation.mutate(n.id)}
                            className="flex-shrink-0 p-1 text-primary-600 hover:text-primary-700"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
