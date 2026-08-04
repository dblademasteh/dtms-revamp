import Select, { type SingleValue } from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'

export type SelectOption = { value: string; label: string; [key: string]: any }

export default function SearchableSelect(props: {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isDisabled?: boolean
  isClearable?: boolean
  className?: string
}) {
  const styles = buildSelectStyles()

  const selectedOption = props.options.find((o) => String(o.value) === String(props.value)) || null

  return (
    <div className={props.className}>
      <Select<SelectOption>
        isSearchable
        isClearable={props.isClearable !== false}
        options={props.options}
        value={selectedOption}
        onChange={(opt: SingleValue<SelectOption>) => props.onChange(opt ? opt.value : '')}
        placeholder={props.placeholder || 'Select...'}
        isDisabled={props.isDisabled}
        styles={styles}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        classNamePrefix="rs"
      />
    </div>
  )
}
