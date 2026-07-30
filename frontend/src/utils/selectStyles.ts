/**
 * buildSelectStyles – returns a react-select `styles` object
 * that adapts its colours to the current dark/light theme.
 *
 * Call this inside the component render (or a useMemo) so it
 * always reads the live class on <html>.
 */
export function buildSelectStyles(isDark?: boolean) {
  const dark = isDark ?? document.documentElement.classList.contains('dark')

  // colour tokens
  const bg          = dark ? '#1e293b' : '#fafafa'   // slate-800 / near-white
  const bgMenu      = dark ? '#1e293b' : '#ffffff'   // slate-800 / white
  const bgHover     = dark ? '#334155' : '#eef2ff'   // slate-700 / indigo-50
  const bgSelected  = dark ? '#312e81' : '#e0e7ff'   // indigo-900 / indigo-100
  const border      = dark ? '#334155' : '#e2e8f0'   // slate-700 / slate-200
  const borderFocus = '#6366f1'
  const text        = dark ? '#f1f5f9' : '#0f172a'   // slate-100 / slate-950
  const textMuted   = dark ? '#94a3b8' : '#94a3b8'   // slate-400
  const divider     = dark ? '#334155' : '#f1f5f9'   // slate-700 / slate-100
  const shadow      = dark
    ? '0 10px 40px -8px rgba(0,0,0,0.6)'
    : '0 10px 40px -8px rgba(0,0,0,0.15)'

  // multi-value chip tokens
  const chipBg     = dark ? '#312e81' : '#eef2ff'    // indigo-900 / indigo-50
  const chipBorder = dark ? '#4338ca' : '#c7d2fe'    // indigo-700 / indigo-200
  const chipText   = dark ? '#a5b4fc' : '#4338ca'    // indigo-300 / indigo-700

  return {
    control: (base: any, state: any) => ({
      ...base,
      minHeight: '40px',
      borderColor: state.isFocused ? borderFocus : border,
      borderRadius: '0.5rem',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
      '&:hover': { borderColor: state.isFocused ? borderFocus : '#818cf8' },
      backgroundColor: bg,
      color: text,
      fontSize: '14px',
      padding: '0',
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      border: `1px solid ${border}`,
      backgroundColor: bgMenu,
      boxShadow: shadow,
    }),
    menuList: (base: any) => ({
      ...base,
      backgroundColor: bgMenu,
      padding: '4px',
    }),
    option: (base: any, state: any) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderRadius: '0.5rem',
      backgroundColor: state.isSelected
        ? bgSelected
        : state.isFocused
        ? bgHover
        : 'transparent',
      color: state.isSelected ? (dark ? '#a5b4fc' : '#4338ca') : text,
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: state.isSelected ? 600 : 400,
      borderBottom: `1px solid ${divider}`,
      '&:active': { backgroundColor: bgSelected },
    }),
    singleValue: (base: any) => ({
      ...base,
      color: text,
    }),
    input: (base: any) => ({
      ...base,
      color: text,
    }),
    multiValue: (base: any) => ({
      ...base,
      borderRadius: '8px',
      backgroundColor: chipBg,
      border: `1px solid ${chipBorder}`,
      margin: '3px 4px 3px 0',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      fontSize: '12px',
      fontWeight: 500,
      color: chipText,
      padding: '4px 8px',
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      borderRadius: '0 6px 6px 0',
      color: chipText,
      '&:hover': { backgroundColor: chipBorder, color: dark ? '#e0e7ff' : '#3730a3' },
    }),
    placeholder: (base: any) => ({
      ...base,
      fontSize: '13px',
      color: textMuted,
    }),
    noOptionsMessage: (base: any) => ({
      ...base,
      fontSize: '13px',
      color: textMuted,
      backgroundColor: bgMenu,
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999,
    }),
    indicatorSeparator: (base: any) => ({
      ...base,
      backgroundColor: border,
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      color: textMuted,
      '&:hover': { color: dark ? '#cbd5e1' : '#475569' },
    }),
    clearIndicator: (base: any) => ({
      ...base,
      color: textMuted,
      '&:hover': { color: dark ? '#f87171' : '#ef4444' },
    }),
  }
}
