import { Search, Check } from 'lucide-react'
import Select, { components, type GroupBase } from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'

export type Option = { value: string; label: string; [key: string]: any }



const Control = ({ children, ...props }: any) => (
  <components.Control {...props}>
    <Search className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
    {children}
  </components.Control>
)

const CheckboxOption = ({ children, ...props }: any) => {
  const isDark = document.documentElement.classList.contains('dark')
  return (
    <components.Option {...props}>
      <span
        className={`flex items-center justify-center w-[18px] h-[18px] mr-2.5 rounded-md border flex-shrink-0 transition-colors ${
          props.isSelected
            ? 'bg-primary-600 border-primary-600'
            : isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'
        }`}
      >
        {props.isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      {children}
    </components.Option>
  )
}

const MultiValueContainer = ({ children, ...props }: any) => (
  <components.MultiValueContainer {...props}>
    <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg px-2 py-0.5 text-xs font-medium">
      {props.data.icon && <props.data.icon className="w-3 h-3" />}
      {children}
    </div>
  </components.MultiValueContainer>
)

export default function MultiSelect(props: {
  options: Option[]
  value: Option[]
  onChange: (v: Option[]) => void
  placeholder?: string
  isDisabled?: boolean
}) {
  const styles = buildSelectStyles()
  return (
    <Select<Option, true, GroupBase<Option>>
      isMulti
      isSearchable
      hideSelectedOptions={false}
      closeMenuOnSelect={false}
      options={props.options}
      value={props.value}
      onChange={(v) => props.onChange(v as Option[])}
      placeholder={props.placeholder}
      isDisabled={props.isDisabled}
      styles={styles}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      classNamePrefix="rs"
      components={{ Control, Option: CheckboxOption, MultiValueContainer }}
    />
  )
}
