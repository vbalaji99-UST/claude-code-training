import { merchantById } from "@/data/merchants"
import { Payment, PaymentStatus } from "@/data/types"
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMNS,
  ExportColumn,
  ExportScope,
} from "./export-columns"
import { formatMoney } from "./money"

export { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS }
export type { ExportColumn, ExportScope }

export type ParsedColumns =
  | { ok: true; columns: ExportColumn[] }
  | { ok: false; error: string }

/** Validates a comma-separated column list from the client against the allowlist. */
export function parseExportColumns(raw: string | null): ParsedColumns {
  if (raw === null) return { ok: true, columns: [...DEFAULT_EXPORT_COLUMNS] }

  const requested = raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  if (requested.length === 0) {
    return { ok: false, error: "Choose at least one column to export." }
  }

  if (requested.some((name) => !EXPORT_COLUMNS.includes(name as ExportColumn))) {
    return { ok: false, error: "One or more columns are not available for export." }
  }
  if (new Set(requested).size !== requested.length) {
    return { ok: false, error: "Each column can be chosen only once." }
  }

  return { ok: true, columns: requested as ExportColumn[] }
}

export function parseExportScope(raw: string | null): ExportScope | null {
  if (raw === null || raw === "filtered") return "filtered"
  if (raw === "all") return "all"
  return null
}

/** Filename label from already-validated values only, never raw input. */
export function exportLabel(
  scope: ExportScope,
  status: PaymentStatus | "all" | undefined,
): string {
  if (scope === "all") return "all"
  return status && status !== "all" ? status : "filtered"
}

// Spreadsheets run cells starting with these as formulas. Amount is exempt: it is
// always our own formatted number, and a leading "-" there is a negative value.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

function escapeCell(value: string, column: ExportColumn): string {
  const safe =
    column !== "amount" && FORMULA_TRIGGER.test(value) ? `'${value}` : value
  if (/[",\r\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column), column)).join(","),
  )
  return [header, ...rows].join("\n")
}

export function exportFilename(date = new Date(), label?: string): string {
  const day = date.toISOString().slice(0, 10)
  return label ? `payments-${label}-${day}.csv` : `payments-${day}.csv`
}
