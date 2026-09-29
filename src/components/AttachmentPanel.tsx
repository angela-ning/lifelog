import { useEffect, useRef, useState } from 'react'
import {
  Download,
  Eye,
  File as FileIcon,
  FileImage,
  FileText,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react'
import * as repo from '../lib/repo'
import { docxToHtml, formatBytes, pdfToText, readMarkdown, sanitizeHtmlString } from '../lib/files'
import { formatDateTime } from '../lib/date'
import type { Attachment } from '../lib/types'
import { MarkdownView } from './MarkdownView'

interface Props {
  ownerId: string
  refType: 'task' | 'journal' | 'review'
  refId: string
  onInsert?: (markdown: string) => void
}

type Preview =
  | { type: 'md'; title: string; content: string }
  | { type: 'html'; title: string; content: string }
  | { type: 'image'; title: string; url: string }

const KIND_ICON: Record<string, JSX.Element> = {
  markdown: <FileText size={15} />,
  pdf: <FileText size={15} />,
  word: <FileText size={15} />,
  image: <FileImage size={15} />,
  other: <FileIcon size={15} />,
}

export function AttachmentPanel({ ownerId, refType, refId, onInsert }: Props) {
  const [items, setItems] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrl = useRef<string | null>(null)

  const refresh = async () => setItems(await repo.listAttachments(ownerId, refType, refId))

  useEffect(() => {
    void refresh()
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, refType, refId])

  async function upload(files: FileList | null) {
    if (!files || !files.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          alert(`「${file.name}」超过 20MB，请压缩后再上传`)
          continue
        }
        await repo.saveAttachment(ownerId, refType, refId, file)
      }
      await refresh()
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function openPreview(att: Attachment) {
    const file = await repo.getFile(att.storage_key)
    if (!file) return
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    if (att.kind === 'image') {
      const url = URL.createObjectURL(file)
      objectUrl.current = url
      setPreview({ type: 'image', title: att.name, url })
      return
    }
    if (att.kind === 'word') {
      const html = sanitizeHtmlString(await docxToHtml(file))
      setPreview({ type: 'html', title: att.name, content: html })
      return
    }
    if (att.kind === 'pdf') {
      const { text } = await pdfToText(file)
      setPreview({ type: 'md', title: att.name, content: `_共 ${text.split('###').length - 1} 页，以下为文本内容_\n\n${text}` })
      return
    }
    if (att.kind === 'markdown') {
      setPreview({ type: 'md', title: att.name, content: await readMarkdown(file) })
      return
    }
    const url = URL.createObjectURL(file)
    window.open(url, '_blank')
  }

  async function download(att: Attachment) {
    const file = await repo.getFile(att.storage_key)
    if (!file) return
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = att.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function insert(att: Attachment) {
    if (!onInsert) return
    const file = await repo.getFile(att.storage_key)
    if (!file) return
    if (att.kind === 'markdown') onInsert(await readMarkdown(file))
    else if (att.kind === 'word') onInsert(sanitizeHtmlString(await docxToHtml(file)))
    else if (att.kind === 'pdf') {
      const { text } = await pdfToText(file)
      onInsert(text)
    } else onInsert(`[${att.name}](${att.storage_key})`)
  }

  return (
    <div className="col">
      <div
        className={`dropzone${drag ? ' over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          void upload(e.dataTransfer.files)
        }}
      >
        <Upload size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
        点击或拖拽上传 Markdown / PDF / Word / 图片等附件（单个 ≤ 20MB）
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {busy && <p className="muted small">上传中…</p>}

      <div className="col" style={{ gap: 8 }}>
        {items.map((att) => (
          <div className="file-item" key={att.id}>
            <div className="file-icon">{KIND_ICON[att.kind] ?? KIND_ICON.other}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{att.name}</div>
              <div className="muted small">
                {formatBytes(att.size)} · {formatDateTime(att.created_at)}
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => void openPreview(att)} title="预览">
              <Eye size={14} />
            </button>
            {onInsert && (
              <button className="btn ghost sm" onClick={() => void insert(att)} title="插入到正文">
                <Paperclip size={14} />
              </button>
            )}
            <button className="btn ghost sm" onClick={() => void download(att)} title="下载">
              <Download size={14} />
            </button>
            <button
              className="btn ghost sm"
              onClick={async () => {
                await repo.deleteAttachment(ownerId, att.id)
                await refresh()
              }}
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {preview && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal" style={{ width: 'min(760px, 100%)' }}>
            <div className="modal-head">
              <h3>{preview.title}</h3>
              <div style={{ flex: 1 }} />
              <button className="btn ghost sm" onClick={() => setPreview(null)}>
                关闭
              </button>
            </div>
            <div className="modal-body">
              {preview.type === 'image' && (
                <img src={preview.url} alt={preview.title} style={{ maxWidth: '100%', borderRadius: 10 }} />
              )}
              {preview.type === 'html' && (
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: preview.content }} />
              )}
              {preview.type === 'md' && (
                <div className="preview-box">
                  <MarkdownView content={preview.content} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
