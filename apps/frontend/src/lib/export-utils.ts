"use client";

// Download an array of rows as a CSV file
export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Open a formatted print window with custom HTML content
export function printHTML(title: string, bodyHTML: string, clinicName?: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <meta charset="utf-8"/>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2e35; padding: 32px; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand .logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0d9488, #059669); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: bold; }
    .brand h1 { font-size: 22px; color: #0d9488; }
    .brand p { font-size: 12px; color: #64748b; }
    .doc-meta { text-align: right; font-size: 12px; color: #64748b; }
    .doc-meta .code { font-size: 18px; font-weight: bold; color: #1a2e35; }
    .barcode-wrap { margin-top: 6px; text-align: right; }
    .barcode-wrap svg { max-width: 180px; height: auto; }
    h2 { font-size: 15px; color: #0d9488; margin: 0 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    .section-block { margin-bottom: 12px; }
    .section-block p { font-size: 13px; line-height: 1.6; color: #334155; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; margin-bottom: 16px; }
    .info-grid div { padding: 4px 0; }
    .info-grid .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-compact { font-size: 13px; margin-bottom: 8px; }
    .info-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; font-size: 13px; margin-bottom: 8px; }
    .info-cell { padding: 2px 0; line-height: 1.5; }
    .info-cell.full { grid-column: 1 / -1; }
    .info-cell .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: inline; }
    .info-cell .dim { color: #94a3b8; font-size: 12px; }
    .info-row { padding: 2px 0; line-height: 1.5; }
    .info-row .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; min-width: 80px; }
    .info-row .dim { color: #94a3b8; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #f0fdfa; color: #0d9488; text-align: left; padding: 10px 12px; border-bottom: 2px solid #0d9488; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .totals { margin-left: auto; width: 280px; font-size: 13px; margin-top: 16px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
    .totals .row.grand { font-weight: bold; font-size: 16px; color: #0d9488; border-bottom: 2px solid #0d9488; padding: 10px 0; }
    .rx-item { display: flex; gap: 10px; padding: 8px 12px; border-left: 3px solid #0d9488; background: #f0fdfa; margin: 6px 0; border-radius: 0 6px 6px 0; align-items: flex-start; }
    .rx-num { font-weight: bold; color: #0d9488; font-size: 13px; min-width: 18px; padding-top: 1px; }
    .rx-body { flex: 1; }
    .rx-item .med { font-weight: bold; font-size: 13px; }
    .rx-item .sig { color: #475569; font-size: 12px; margin-top: 1px; }
    .signature { margin-top: 48px; display: flex; justify-content: space-between; }
    .signature .sig-block { text-align: center; }
    .signature .line { border-top: 1px solid #475569; width: 200px; margin-bottom: 4px; }
    .signature .name { font-weight: bold; font-size: 13px; }
    .signature .role { font-size: 11px; color: #64748b; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge.teal { background: #f0fdfa; color: #0d9488; }
    .badge.rose { background: #fef2f2; color: #e11d48; }
    .badge.emerald { background: #ecfdf5; color: #059669; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
  </style></head><body>${bodyHTML}
  <div class="footer">${clinicName || "Healthcare Provider"} · Generated on ${new Date().toLocaleString()} · This is a computer-generated document.</div>
  <script>
    window.onload = function(){
      try {
        document.querySelectorAll('.barcode-svg').forEach(function(el){
          JsBarcode(el, el.getAttribute('data-code'), {
            format: 'CODE128',
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 12,
            font: 'monospace',
            textMargin: 2,
            margin: 0
          });
        });
      } catch(e){}
      setTimeout(function(){ window.print(); }, 500);
    };
  <\/script>
  </body></html>`);
  w.document.close();
}

export function docHeader(code: string, codeLabel: string, dateStr: string, statusBadge = "", clinicName?: string) {
  return `<div class="doc-header">
    <div class="brand">
      <div class="logo">+</div>
      <div><h1>${clinicName || "Health Center"}</h1><p>${clinicName ? "" : "Healthcare Provider"}</p></div>
    </div>
    <div class="doc-meta">
      <div class="code">${code}</div>
      <div>${codeLabel}</div>
      <div>${dateStr}</div>
      ${statusBadge}
      <div class="barcode-wrap"><svg class="barcode-svg" data-code="${code}"></svg></div>
    </div>
  </div>`;
}
