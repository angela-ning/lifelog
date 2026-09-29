import { useRef, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { MarkdownView } from './MarkdownView'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minRows?: number
}

const TOOLS: { label: string; wrap?: [string, string]; prefix?: string }[] = [
  { label: '粗体', wrap: ['**', '**'] },
  { label: '斜体', wrap: ['*', '*'] },
  { label: '标题', prefix: '## ' },
  { label: '列表', prefix: '- ' },
  { label: '待办', prefix: '- [ ] ' },
  { label: '引用', prefix: '> ' },
  { label: '代码', wrap: ['```\n', '\n```'] },
  { label: '表格', prefix: '| 项目 | 说明 |\n| --- | --- |\n|  |  |' },
]

export function MarkdownEditor({ value, onChange, placeholder, minRows = 10 }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const ref = useRef<HTMLTextAreaElement>(null)

  const apply = (tool: (typeof TOOLS)[number]) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    let inserted: string
    let cursor: number
    if (tool.wrap) {
      inserted = `${tool.wrap[0]}${selected || '文本'}${tool.wrap[1]}`
      cursor = start + tool.wrap[0].length + (selected || '文本').length
    } else {
      inserted = `${tool.prefix}${selected || ''}`
      cursor = start + inserted.length
    }
    const next = value.slice(0, start) + inserted + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="editor-toolbar" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
          {TOOLS.map((t) => (
            <button key={t.label} type="button" onClick={() => apply(t)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="segmented">
          <button
            type="button"
            className={tab === 'edit' ? 'active' : ''}
            onClick={() => setTab('edit')}
          >
            <Pencil size={13} /> 编辑
          </button>
          <button
            type="button"
            className={tab === 'preview' ? 'active' : ''}
            onClick={() => setTab('preview')}
          >
            <Eye size={13} /> 预览
          </button>
        </div>
      </div>
      {tab === 'edit' ? (
        <textarea
          ref={ref}
          className="textarea md"
          style={{ minHeight: minRows * 22 }}
          value={value}
          placeholder={placeholder ?? '支持 Markdown：**加粗**、- 列表、- [ ] 待办、```代码块```、> 引用、| 表格 |'}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="preview-box">
          <MarkdownView content={value} />
        </div>
      )}
    </div>
  )
}
