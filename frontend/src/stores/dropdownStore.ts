import { create } from 'zustand'
import type { DropdownOption } from '@/types'

interface DropdownState {
  groups: Record<string, DropdownOption[]>
  isLoading: boolean
  setGroups: (groups: Record<string, DropdownOption[]>) => void
  setLoading: (loading: boolean) => void
  replaceGroup: (group: string, options: DropdownOption[]) => void
}

export const useDropdownStore = create<DropdownState>((set) => ({
  groups: {},
  isLoading: false,
  setGroups: (groups) => set({ groups }),
  setLoading: (loading) => set({ isLoading: loading }),
  replaceGroup: (group, options) =>
    set((state) => ({ groups: { ...state.groups, [group]: options } })),
}))
