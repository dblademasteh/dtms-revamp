import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useDropdownStore } from '@/stores/dropdownStore'
import { DEFAULT_GROUPS } from '@/constants/documentOptions'
import type { Option } from '@/constants/documentOptions'
import type { DropdownOption } from '@/types'

type GroupsMap = Record<string, DropdownOption[]>

export function useDropdownGroup(group: string): Option[] {
  const loaded = useDropdownStore((state) => state.groups[group])
  return loaded && loaded.length
    ? loaded.filter((o) => o.is_active)
    : (DEFAULT_GROUPS[group] ?? [])
}

export function useDropdownOptions() {
  const groups = useDropdownStore((state) => state.groups)
  const isLoading = useDropdownStore((state) => state.isLoading)

  const query = useQuery({
    queryKey: ['dropdown-options'],
    queryFn: async (): Promise<GroupsMap> => {
      const res = await api.get('/dropdown-options')
      return (res.data?.groups as GroupsMap) ?? {}
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.data) {
      useDropdownStore.getState().setGroups(query.data)
    }
  }, [query.data])

  useEffect(() => {
    useDropdownStore.getState().setLoading(query.isLoading)
  }, [query.isLoading])

  return {
    groups,
    isLoading: isLoading || query.isLoading,
    refetch: query.refetch,
  }
}
