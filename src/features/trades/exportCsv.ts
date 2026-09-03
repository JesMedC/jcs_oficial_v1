/*
 * exportCsv.ts — Tiny browser-side CSV exporter.
 *
 * Used by the Operaciones page to dump the current filtered trades to
 * a file. We intentionally stay in plain JS (no blob/CSV libs) to
 * keep the bundle tiny:
 *
 *   - Quote every field (RFC 4180-ish: escape internal " as "")
 *   - Use ; separator because Excel in es-AR opens ; separated files
 *     by default (locale-friendly). Comma would break numeric parsing.
 *   - Prepend a UTF-8 BOM so Excel doesn't mojibake the ñ/ñ/í/etc.
 *   - Build the blob with the proper MIME and use a transient
 *     <a download> to trigger the file save dialog.
 */

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Always quote — simpler than trying to detect when needed, and
  // safely handles values that contain newlines, commas, semicolons
  // or double-quotes (which we escape by doubling).
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<CsvCell>>,
  separator = ';',
): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(separator));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(separator));
  }
  // CRLF so Excel handles newlines cleanly on every OS.
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // BOM for Excel UTF-8 detection.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Anchor must be in the document for click() to work in all browsers.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke the object URL on the next tick so the browser has time
  // to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
