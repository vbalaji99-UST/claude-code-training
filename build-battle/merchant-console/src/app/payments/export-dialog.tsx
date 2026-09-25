"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMNS,
  ExportColumn,
  ExportScope,
} from "@/lib/export-columns"
import { Download } from "lucide-react"
import { useEffect, useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

type Counts = Record<ExportScope, number | null>

async function fetchTotal(query: string): Promise<number> {
  const response = await fetch(`/api/payments?${query}`)
  if (!response.ok) throw new Error("count failed")
  const body: { total: number } = await response.json()
  return body.total
}

export function ExportDialog({ query }: { query: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ExportColumn[]>([
    ...DEFAULT_EXPORT_COLUMNS,
  ])
  const [scope, setScope] = useState<ExportScope>("filtered")
  const [counts, setCounts] = useState<Counts>({ filtered: null, all: null })
  const [countError, setCountError] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCounts({ filtered: null, all: null })
    setCountError(false)
    Promise.all([fetchTotal(query), fetchTotal("")])
      .then(([filtered, all]) => {
        if (!cancelled) setCounts({ filtered, all })
      })
      .catch(() => {
        if (!cancelled) setCountError(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, query])

  // Every open starts from the safe defaults, so a past "all" or last-four choice never carries over.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setScope("filtered")
      setSelected([...DEFAULT_EXPORT_COLUMNS])
    }
    setOpen(next)
  }

  const toggle = (column: ExportColumn) =>
    setSelected((current) =>
      current.includes(column)
        ? current.filter((c) => c !== column)
        : EXPORT_COLUMNS.filter((c) => c === column || current.includes(c)),
    )

  const params = new URLSearchParams(scope === "filtered" ? query : "")
  params.set("scope", scope)
  params.set("columns", selected.join(","))
  const href = `/api/payments/export?${params.toString()}`

  const count = counts[scope]
  const canDownload = selected.length > 0

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose what goes into the CSV before you send it anywhere.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-6">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {(
                [
                  ["filtered", "Current filter"],
                  ["all", "All payments"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="radio"
                    name="export-scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => setScope(value)}
                    className="size-4 accent-blue-600"
                  />
                  {label}
                  <span className="text-gray-500 tabular-nums">
                    {counts[value] === null ? "" : `(${counts[value]!.toLocaleString()} rows)`}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXPORT_COLUMNS.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(column)}
                    onChange={() => toggle(column)}
                    className="size-4 accent-blue-600"
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-sm text-gray-500" aria-live="polite">
            {countError
              ? "Could not load the row count. The export will still include every matching payment."
              : count === null
                ? "Counting rows…"
                : `${count.toLocaleString()} ${count === 1 ? "payment" : "payments"} will be exported.`}
            {!canDownload && " Select at least one column to download."}
          </p>
        </DrawerBody>
        <DrawerFooter className="gap-2">
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
          {canDownload ? (
            <Button asChild>
              <a href={href} download onClick={() => setOpen(false)}>
                Download CSV
              </a>
            </Button>
          ) : (
            <Button disabled>Download CSV</Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
