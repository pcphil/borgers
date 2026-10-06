import type { ReactNode } from 'react'

export function Panel({
  title,
  onClose,
  children,
  className = '',
}: {
  title: string
  onClose?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`pointer-events-auto flex max-h-full flex-col rounded-xl border border-amber-900/20 bg-amber-50/95 shadow-xl backdrop-blur ${className}`}
    >
      <div className="flex items-center justify-between border-b border-amber-900/10 px-3 py-2">
        <h2 className="font-bold text-amber-950">{title}</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-amber-900 hover:bg-amber-200"
            aria-label="Close"
          >
            ✕
          </button>
        ) : null}
      </div>
      <div className="min-h-0 overflow-y-auto p-3 text-sm text-amber-950">{children}</div>
    </div>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  title,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  title?: string
  className?: string
}) {
  const styles = {
    default: 'bg-white border-amber-900/20 hover:bg-amber-100',
    primary: 'bg-red-600 text-white border-red-700 hover:bg-red-500',
    danger: 'bg-white text-red-700 border-red-300 hover:bg-red-50',
    ghost: 'border-transparent hover:bg-amber-200/60',
  }[variant]
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-amber-900/70">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-amber-900/10">
        <div
          className="h-1.5 rounded bg-amber-600"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  )
}

export const Stars = ({ n }: { n: number }) => (
  <span className="tracking-tight text-amber-500" title={`${n} star rating`}>
    {'★'.repeat(n)}
    <span className="text-amber-900/20">{'★'.repeat(Math.max(0, 5 - n))}</span>
  </span>
)
