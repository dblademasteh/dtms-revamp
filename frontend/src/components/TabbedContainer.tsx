import { ReactNode, useState } from 'react'
import { cn } from '@/utils/cn'

export interface TabConfig {
  id: string
  label: string
  icon?: ReactNode
  count?: number
  disabled?: boolean
  suffix?: ReactNode
}

interface TabbedContainerProps {
  tabs: TabConfig[]
  defaultTab?: string
  activeTab?: string
  onChange?: (tabId: string) => void
  children: ReactNode
  className?: string
  contentClassName?: string
}

export default function TabbedContainer({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onChange,
  children,
  className,
  contentClassName,
}: TabbedContainerProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id)
  const activeTab = controlledTab ?? internalTab

  const handleTabChange = (tabId: string) => {
    if (controlledTab === undefined) {
      setInternalTab(tabId)
    }
    onChange?.(tabId)
  }

  const activeTabData = tabs.find((t) => t.id === activeTab)

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab List */}
      <div
        className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label="Tabbed interface"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          const baseCls =
            'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
          const activeCls =
            'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-700'
          const inactiveCls =
            'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/40'
          const disabledCls =
            'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500'

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
              className={cn(
                baseCls,
                tab.disabled ? disabledCls : isActive ? activeCls : inactiveCls
              )}
            >
              {tab.icon && <span className="flex items-center">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.suffix && <span className="flex items-center">{tab.suffix}</span>}
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5',
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-5">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            aria-hidden={tab.id !== activeTab}
            className={cn(
              'focus:outline-none',
              tab.id === activeTab ? 'block' : 'hidden'
            )}
          >
            <div className={cn(contentClassName)}>{activeTabData?.id === tab.id && children}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
