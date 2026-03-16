const USER_ID = 'b40f34d9-d4ae-4600-8d19-8e3654426e52'
const ADMIN_SECRET = 'ff3a827c88d46aa6488a3a5c98dc2588553e44bcbef7f835bfbc912b37f11cde'
const BASE_URL = 'https://memory-chat-ochre.vercel.app'
const S = 'cmmoawi54000004l5qc0dugv3'   // monitoring_shipments.csv
const K = 'cmmotlgjo001qa8mvktztjeox'   // monitoring_contracts.csv (has status col)
const F = 'cmmoawl8t000104l5y49vbace'   // finance.csv

const widgets = [
  // Row 1: Alert KPIs (4 half-width)
  { id: 'kpi-overdue',   type: 'kpi', title: 'Overdue',          layout: 'half', fileId: K, config: { aggregate: 'filter_count', column: 'status', filterValue: 'Overdue',  format: 'number' } },
  { id: 'kpi-pending',   type: 'kpi', title: 'Pending',          layout: 'half', fileId: K, config: { aggregate: 'filter_count', column: 'status', filterValue: 'Pending',  format: 'number' } },
  { id: 'kpi-contracts', type: 'kpi', title: 'Unique Contracts', layout: 'half', fileId: K, config: { aggregate: 'count_distinct', column: 'contract_no',                   format: 'number' } },
  { id: 'kpi-revenue',   type: 'kpi', title: 'Revenue (USD)',    layout: 'half', fileId: F, config: { aggregate: 'sum', column: 'usd',                                       format: 'currency_usd' } },

  // Row 2: Shipment bar chart with labels (uses shipments file, correct column name)
  { id: 'bar-shipment', type: 'bar_chart', title: 'Monthly Shipments (MT)', layout: 'full', fileId: S, config: { xAxis: 'shipment_month', yAxis: 'shipment_qty', xFormat: 'month', format: 'number' } },

  // Row 3: Overdue contracts table
  { id: 'table-overdue',  type: 'table', title: 'Overdue Contracts',  layout: 'full', fileId: K, config: { columns: ['contract_no', 'customer', 'product', 'qty_contracted', 'bal', 'delivery_end', 'team'], filterColumn: 'status', filterValue: 'Overdue',  orderBy: 'delivery_end', orderDir: 'asc' } },

  // Row 4: Pending contracts table
  { id: 'table-pending', type: 'table', title: 'Pending Contracts', layout: 'full', fileId: K, config: { columns: ['contract_no', 'customer', 'product', 'qty_contracted', 'bal', 'delivery_end', 'team'], filterColumn: 'status', filterValue: 'Pending', orderBy: 'delivery_end', orderDir: 'asc' } },
]

const res = await fetch(`${BASE_URL}/api/admin/users/${USER_ID}/config`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${ADMIN_SECRET}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ widgets }),
})
const json = await res.json()
console.log('widgets:', json.widgetCount, '| updated:', json.updatedAt)
