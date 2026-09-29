import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TAG_COLORS, type Tag } from '../lib/types'

interface Props {
  tags: Tag[]
  selected: string[]
  onChange: (ids: string[]) => void
  onCreate: (name: string, color: string) => Promise<Tag>
}

export function TagPicker({ tags, selected, onChange, onCreate }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [adding, setAdding] = useState(false)

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="chip-row">
        {tags.map((tag) => {
          const active = selected.includes(tag.id)
          return (
            <button
              type="button"
              key={tag.id}
              className={`tag${active ? ' active' : ''}`}
              style={active ? { color: tag.color } : undefined}
              onClick={() => toggle(tag.id)}
            >
              <i className="tag-dot" style={{ background: tag.color }} />
              {tag.name}
            </button>
          )
        })}
        {tags.length === 0 && <span className="muted small">还没有标签，先创建一个吧</span>}
      </div>

      {adding ? (
        <div className="row wrap">
          <input
            className="input"
            style={{ width: 160 }}
            placeholder="标签名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="row" style={{ gap: 4 }}>
            {TAG_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: c,
                  border: c === color ? '2px solid #1f2430' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            className="btn sm"
            onClick={async () => {
              if (!name.trim()) return
              await onCreate(name.trim(), color)
              setName('')
              setAdding(false)
            }}
          >
            添加
          </button>
          <button className="btn ghost sm" onClick={() => setAdding(false)}>
            取消
          </button>
        </div>
      ) : (
        <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}>
          <Plus size={13} /> 新建标签
        </button>
      )}
    </div>
  )
}
