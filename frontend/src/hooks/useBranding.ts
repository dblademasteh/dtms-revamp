import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/services/api'

export interface Branding {
  system_title: string
  system_description: string
  login_logo: string | null
  sidebar_logo: string | null
}

export const DEFAULT_BRANDING: Branding = {
  system_title: 'DTMS',
  system_description: 'Document Tracking & Management',
  login_logo: null,
  sidebar_logo: null,
}

export function useBranding() {
  const { data } = useQuery<Branding>({
    queryKey: ['branding'],
    queryFn: () =>
      publicApi
        .get('/branding')
        .then((res) => ({
          ...DEFAULT_BRANDING,
          ...(res.data?.branding ?? {}),
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return data ?? DEFAULT_BRANDING
}
