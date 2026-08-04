import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { BFP_RANKS } from '@/constants/documentOptions'

export interface RankOption {
  value: string
  label: string
}

export function useRanks(): RankOption[] {
  const { data } = useQuery<RankOption[]>({
    queryKey: ['ranks'],
    queryFn: () => api.get('/ranks').then((res) => res.data),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return data && Array.isArray(data) && data.length > 0 ? data : BFP_RANKS
}
