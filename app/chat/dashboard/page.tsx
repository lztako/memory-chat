import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { DashboardView } from "@/components/DashboardView"

// ── Widget config types (stored in DB) ────────────────────────────
type WidgetConfig = {
  id: string
  type: "kpi" | "bar_chart" | "donut_chart" | "table" | "horizontal_bar" | "progress_kpi" | "line_chart"
  title: string
  layout?: "full" | "half"
  fileId?: string
  config: {
    column?: string
    aggregate?: "sum" | "count" | "count_distinct" | "filter_count"
    filterValue?: string
    format?: string
    suffix?: string
    target?: number
    targetColumn?: string
    targetAggregate?: "sum" | "count"
    groupBy?: string
    valueColumn?: string
    xAxis?: string
    xFormat?: "month"
    yAxis?: string
    columns?: string[]
    orderBy?: string
    orderDir?: "asc" | "desc"
    limit?: number
  }
}

// ── Computed widget types (passed to client) ───────────────────────
export type ComputedKPI = {
  id: string; type: "kpi"; title: string; layout?: "full" | "half"
  value: number; format: string
}
export type ComputedBarChart = {
  id: string; type: "bar_chart"; title: string; layout?: "full" | "half"
  data: { label: string; value: number }[]
  valueFormat?: string
}
export type ComputedDonut = {
  id: string; type: "donut_chart"; title: string; layout?: "full" | "half"
  data: { name: string; value: number }[]
}
export type ComputedTable = {
  id: string; type: "table"; title: string; layout?: "full" | "half"
  columns: string[]; rows: Record<string, string>[]
}
export type ComputedHorizontalBar = {
  id: string; type: "horizontal_bar"; title: string; layout?: "full" | "half"
  data: { label: string; value: number }[]; valueFormat?: string
}
export type ComputedProgressKPI = {
  id: string; type: "progress_kpi"; title: string; layout?: "full" | "half"
  value: number; target: number; percent: number; format: string; suffix?: string
}
export type ComputedLineChart = {
  id: string; type: "line_chart"; title: string; layout?: "full" | "half"
  data: { label: string; value: number }[]; valueFormat?: string
}
export type ComputedWidget = ComputedKPI | ComputedBarChart | ComputedDonut | ComputedTable | ComputedHorizontalBar | ComputedProgressKPI | ComputedLineChart

// ── Aggregate helpers ──────────────────────────────────────────────
type Row = Record<string, string>

function sumCol(data: Row[], col: string): number {
  return data.reduce((s, r) => s + (parseFloat(r[col] ?? "0") || 0), 0)
}

function groupByMonth(data: Row[], dateCol: string, valCol: string) {
  const m: Record<string, number> = {}
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  for (const r of data) {
    const d = new Date(r[dateCol] ?? "")
    if (isNaN(d.getTime())) continue
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    m[k] = (m[k] ?? 0) + (parseFloat(r[valCol] ?? "0") || 0)
  }
  return Object.entries(m)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, value]) => {
      const [year, mon] = k.split("-")
      return { label: `${MONTHS[parseInt(mon) - 1]} ${year}`, value }
    })
}

function groupByCol(data: Row[], groupCol: string, valCol: string) {
  const m: Record<string, number> = {}
  for (const r of data) {
    const k = r[groupCol] ?? "Unknown"
    m[k] = (m[k] ?? 0) + (parseFloat(r[valCol] ?? "0") || 0)
  }
  return Object.entries(m)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))
}

async function computeWidget(
  widget: WidgetConfig,
  cache: Map<string, Row[]>
): Promise<ComputedWidget | null> {
  let data: Row[] = []

  if (widget.fileId) {
    if (!cache.has(widget.fileId)) {
      const file = await prisma.userFile.findUnique({ where: { id: widget.fileId } })
      if (!file) return null
      cache.set(widget.fileId, file.data as Row[])
    }
    data = cache.get(widget.fileId)!
  }

  const { config } = widget

  if (widget.type === "kpi") {
    let value = 0
    if (config.aggregate === "count") {
      value = data.length
    } else if (config.aggregate === "sum" && config.column) {
      value = sumCol(data, config.column)
    } else if (config.aggregate === "count_distinct" && config.column) {
      value = new Set(data.map(r => r[config.column!])).size
    } else if (config.aggregate === "filter_count" && config.column && config.filterValue) {
      value = data.filter(r => r[config.column!] === config.filterValue).length
    }
    return { id: widget.id, type: "kpi", title: widget.title, layout: widget.layout, value, format: config.format ?? "number" }
  }

  if (widget.type === "bar_chart") {
    let chartData: { label: string; value: number }[] = []
    if (config.xFormat === "month" && config.xAxis && config.yAxis) {
      chartData = groupByMonth(data, config.xAxis, config.yAxis)
    }
    return { id: widget.id, type: "bar_chart", title: widget.title, layout: widget.layout, data: chartData, valueFormat: config.format }
  }

  if (widget.type === "donut_chart") {
    let chartData: { name: string; value: number }[] = []
    if (config.groupBy && config.valueColumn) {
      chartData = groupByCol(data, config.groupBy, config.valueColumn).slice(0, 8)
    }
    return { id: widget.id, type: "donut_chart", title: widget.title, layout: widget.layout, data: chartData }
  }

  if (widget.type === "table") {
    let rows = [...data]
    if (config.orderBy) {
      const dir = config.orderDir ?? "desc"
      rows = rows.sort((a, b) => {
        const av = a[config.orderBy!] ?? ""
        const bv = b[config.orderBy!] ?? ""
        return dir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv)
      })
    }
    if (config.limit) rows = rows.slice(0, config.limit)
    return { id: widget.id, type: "table", title: widget.title, layout: widget.layout, columns: config.columns ?? [], rows }
  }

  if (widget.type === "horizontal_bar") {
    let chartData: { label: string; value: number }[] = []
    if (config.groupBy && config.valueColumn) {
      const grouped = groupByCol(data, config.groupBy, config.valueColumn)
      const limited = config.limit ? grouped.slice(0, config.limit) : grouped
      chartData = limited.map(({ name, value }) => ({ label: name, value }))
    }
    return { id: widget.id, type: "horizontal_bar", title: widget.title, layout: widget.layout, data: chartData, valueFormat: config.format }
  }

  if (widget.type === "progress_kpi") {
    // compute numerator
    let value = 0
    if (config.aggregate === "count") value = data.length
    else if (config.aggregate === "sum" && config.column) value = sumCol(data, config.column)
    else if (config.aggregate === "count_distinct" && config.column) value = new Set(data.map(r => r[config.column!])).size
    else if (config.aggregate === "filter_count" && config.column && config.filterValue) value = data.filter(r => r[config.column!] === config.filterValue).length

    // compute denominator
    let target = config.target ?? 0
    if (!config.target && config.targetColumn && config.targetAggregate) {
      if (config.targetAggregate === "sum") target = sumCol(data, config.targetColumn)
      else if (config.targetAggregate === "count") target = data.length
    }
    const percent = target > 0 ? Math.min(value / target, 1) : 0
    return { id: widget.id, type: "progress_kpi", title: widget.title, layout: widget.layout, value, target, percent, format: config.format ?? "number", suffix: config.suffix }
  }

  if (widget.type === "line_chart") {
    let chartData: { label: string; value: number }[] = []
    if (config.xFormat === "month" && config.xAxis && config.yAxis) {
      chartData = groupByMonth(data, config.xAxis, config.yAxis)
    }
    return { id: widget.id, type: "line_chart", title: widget.title, layout: widget.layout, data: chartData, valueFormat: config.format }
  }

  return null
}

// ── Page ───────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dashboard = await prisma.userDashboard.findUnique({ where: { userId: user.id } })

  if (!dashboard || !(dashboard.widgets as unknown[]).length) {
    return <DashboardView widgets={[]} />
  }

  const configs = dashboard.widgets as unknown as WidgetConfig[]
  const cache = new Map<string, Row[]>()
  const results = await Promise.all(configs.map(w => computeWidget(w, cache)))
  const widgets = results.filter((w): w is ComputedWidget => w !== null)

  return <DashboardView widgets={widgets} />
}
