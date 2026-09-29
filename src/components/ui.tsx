import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  onClose,
  children,
  footer,
  width,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={width ? { width: `min(${width}px, 100%)` } : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <div className="spacer" style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({
  title,
  message,
  confirmText = '确认删除',
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmText?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text-2)' }}>{message}</p>
    </Modal>
  )
}

export function ProgressBar({
  value,
  color,
  slim,
  height,
}: {
  value: number
  color?: string
  slim?: boolean
  height?: number
}) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={`progress${slim ? ' slim' : ''}`} style={height ? { height } : undefined}>
      <i style={{ width: `${v}%`, background: color ?? 'var(--primary)' }} />
    </div>
  )
}

export function Ring({
  percent,
  size = 62,
  stroke = 7,
  color = '#4f46e5',
  children,
}: {
  percent: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span className="ring-label" style={{ color }}>
        {children ?? `${p}%`}
      </span>
    </div>
  )
}

export function Stat({
  label,
  value,
  foot,
  icon,
  color,
}: {
  label: string
  value: ReactNode
  foot?: ReactNode
  icon?: ReactNode
  color?: string
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

export function Empty({ emoji = '🌱', text, action }: { emoji?: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-emoji">{emoji}</span>
      {text}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [v, setV] = useState(initial)
  return [v, () => setV((x) => !x), setV]
}
