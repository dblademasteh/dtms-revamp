import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import { BFP_RANKS } from '@/constants/documentOptions'

export interface RankOption {
  value: string
  label: string
}

export function useRanks(): RankOption[] {
  const ranks = useDropdownGroup('ranks')
  return ranks && ranks.length ? ranks : BFP_RANKS
}
