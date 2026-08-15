import Select, { type SingleValue } from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { buildSelectStyles } from '@/utils/selectStyles'

export type SelectOption = { value: string; label: string; [key: string]: any }

export default function SearchableSelect(props: {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isDisabled?: boolean
  isClearable?: boolean
  allowCreate?: boolean
  className?: string
}) {
  const styles = buildSelectStyles()

  const fromOptions = props.options.find((o) => String(o.value) === String(props.value))
  const selectedOption =
    fromOptions || (props.allowCreate && props.value ? { value: props.value, label: props.value } : null)

  const common = {
    isSearchable: true,
    isClearable: props.isClearable !== false,
    options: props.options,
    value: selectedOption,
    onChange: (opt: SingleValue<SelectOption>) => props.onChange(opt ? opt.value : ''),
    placeholder: props.placeholder || 'Select...',
    isDisabled: props.isDisabled,
    styles,
    menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
    menuPosition: 'fixed' as const,
    classNamePrefix: 'rs',
  }

  return (
    <div className={props.className}>
      {props.allowCreate ? (
        <CreatableSelect {...(common as any)} />
      ) : (
        <Select {...common} />
      )}
    </div>
  )
}
