import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

/** 允许代码高亮和 Word 转换出的基础排版类名 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'align', 'colspan', 'rowspan'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
  },
}

const rehypePlugins = [rehypeRaw, [rehypeSanitize, schema], rehypeHighlight] as never[]

export function MarkdownView({ content }: { content: string }) {
  if (!content?.trim()) {
    return <p className="muted small">还没有内容，点击「编辑」写下第一段记录吧。</p>
  }
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
