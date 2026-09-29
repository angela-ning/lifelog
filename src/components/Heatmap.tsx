import { addDays, diffDays, parseISO, startOfWeek, today } from '../lib/date'

interface Props {
  /** 已打卡日期 YYYY-MM-DD */
  dates: string[]
  weeks?: number
  color?: string
}

const LEVEL_CLASS = ['', 'l1', 'l2', 'l3', 'l4']

export function Heatmap({ dates, weeks = 16, color }: Props) {
  const ref = today()
  const set = new Set(dates)
  const first = startOfWeek(addDays(ref, -(weeks * 7 - 1)))
  const cols: { date: string; count: number }[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d)
      if (diffDays(date, ref) < 0) continue
      col.push({ date, count: set.has(date) ? 1 : 0 })
    }
    cols.push(col)
  }

  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="heatmap scroll-x">
        {cols.map((col, i) => (
          <div className="heat-col" key={i}>
            {Array.from({ length: 7 }).map((_, d) => {
              const cell = col.find((c) => parseISO(c.date).getDay() === (d + 1) % 7)
              if (!cell) return <div className="heat-cell" key={d} style={{ background: 'transparent' }} />
              const level = cell.count > 0 ? 4 : 0
              return (
                <div
                  key={d}
                  className={`heat-cell ${LEVEL_CLASS[level]}${cell.date === ref ? ' today' : ''}`}
                  style={cell.count && color ? { background: color } : undefined}
                  title={`${cell.date}${cell.count ? ' 已打卡' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heat-legend">
        少
        {['', 'l1', 'l2', 'l3', 'l4'].map((c, i) => (
          <div key={i} className={`heat-cell ${c}`} style={i === 4 && color ? { background: color } : undefined} />
        ))}
        多 · 近 {weeks} 周
      </div>
    </div>
  )
}
