import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import {
  exportFilename,
  exportLabel,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseExportColumns(params.get("columns"))
  if (!columns.ok) {
    return NextResponse.json({ error: columns.error }, { status: 400 })
  }

  const scope = parseExportScope(params.get("scope"))
  if (!scope) {
    return NextResponse.json(
      { error: "Scope must be either the current filter or all payments." },
      { status: 400 },
    )
  }

  const filters = parseFilters(params)
  const matching = scope === "all" ? filterPayments({}) : filterPayments(filters)
  const rows = sortPayments(matching, filters.sort, filters.direction)
  const filename = exportFilename(new Date(), exportLabel(scope, filters.status))

  return new Response(toCsv(rows, columns.columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
