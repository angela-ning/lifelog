/** 附件读取与解析：Markdown / Word / PDF / 图片 */
/** PDF / Word 解析器体积较大，按需动态加载，避免拖慢首屏 */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })()
  }
  return pdfjsPromise
}

async function loadMammoth() {
  // @ts-expect-error mammoth 浏览器构建没有类型声明
  return (await import('mammoth/mammoth.browser.js')) as {
    convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
  }
}

export function formatBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1)
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

export async function readMarkdown(file: File): Promise<string> {
  return readAsText(file)
}

export async function docxToHtml(file: File): Promise<string> {
  const mammoth = await loadMammoth()
  const buf = await file.arrayBuffer()
  const res = await mammoth.convertToHtml({ arrayBuffer: buf })
  return res.value as string
}

/** 事件属性名一律剔除（onclick / onerror / onload …） */
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'link',
  'meta',
  'base',
  'noscript',
  'template',
  'svg',
  'math',
])

/** 保留的常见排版属性，其余属性（含所有 on* 事件）一律移除 */
const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'class',
  'colspan',
  'rowspan',
  'width',
  'height',
  'align',
  'type',
  'start',
])

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:']

function isSafeUrl(value: string): boolean {
  const raw = value.trim()
  if (!raw) return false
  // 相对路径、锚点与图片内联 data URL 放行，其余 data: 一律拦掉
  if (/^[/#]/.test(raw)) return true
  if (raw.toLowerCase().startsWith('data:')) return /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);/i.test(raw)
  try {
    return SAFE_PROTOCOLS.includes(new URL(raw, window.location.href).protocol)
  } catch {
    return false
  }
}

/**
 * 清洗来自 Word / 外部 HTML 的内容，仅用于 dangerouslySetInnerHTML 之前。
 * Markdown 正文走 rehype-sanitize 白名单，这条路径没有，因此在此补齐。
 */
export function sanitizeHtmlString(html: string): string {
  const host = document.createElement('div')
  host.innerHTML = html
  Array.from(host.querySelectorAll('*')).forEach((el) => {
    if (DROPPED_TAGS.has(el.tagName.toLowerCase())) {
      el.remove()
      return
    }
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
        el.removeAttribute(attr.name)
        return
      }
      if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name)
      }
    })
  })
  return host.innerHTML
}

export async function pdfToText(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs = await loadPdfjs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    text += `### 第 ${i} 页\n\n${pageText}\n\n`
  }
  return { text, pages: pdf.numPages }
}

/** 把附件解析成可在详情里渲染的 Markdown */
export async function attachmentToMarkdown(file: File, name: string): Promise<string> {
  const lower = name.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
    return readMarkdown(file)
  }
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    const html = await docxToHtml(file)
    return `\n${html}\n`
  }
  if (lower.endsWith('.pdf')) {
    const { text, pages } = await pdfToText(file)
    return `_PDF 共 ${pages} 页，以下为提取的文本_\n\n${text}`
  }
  return ''
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
