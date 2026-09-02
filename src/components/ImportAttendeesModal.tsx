import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeNigerianPhone } from '../lib/phone';

type ParsedRow = { full_name: string; phone: string; organisation: string; valid: boolean; reason?: string };
type ImportResult = { inserted: number; skipped: number; results: { row: number; status: 'ok' | 'error'; reason?: string }[] };

const findKey = (headers: string[], pattern: RegExp) => headers.find((header) => pattern.test(header));

function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const nameKey = findKey(headers, /full.?name|^name$/i);
  const phoneKey = findKey(headers, /phone|mobile|tel/i);
  const orgKey = findKey(headers, /union|organi[sz]ation|company/i);

  return rows.map((row) => {
    const full_name = String(nameKey ? row[nameKey] : '').trim();
    const rawPhone = String(phoneKey ? row[phoneKey] : '').trim();
    const organisation = String(orgKey ? row[orgKey] : '').trim();
    const normalizedPhone = normalizeNigerianPhone(rawPhone);
    let reason: string | undefined;
    if (full_name.length < 2) reason = 'Missing or invalid full name';
    else if (!normalizedPhone) reason = 'Missing or invalid Nigerian phone number';
    return { full_name, phone: normalizedPhone || rawPhone, organisation, valid: !reason, reason };
  });
}

function downloadTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Full name', 'Phone', 'Union/Organisation'],
    ['Jane Doe', '0803 123 4567', 'Local 42 Union'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'attendee-import-template.xlsx';
  anchor.click();
  URL.revokeObjectURL(href);
}

export default function ImportAttendeesModal({ eventId, onClose, onImported, api }: {
  eventId: string;
  onClose: () => void;
  onImported: () => void;
  api: (url: string, options?: RequestInit) => Promise<ImportResult>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validCount = rows.filter((row) => row.valid).length;

  const handleFile = async (file: File) => {
    setParseError(''); setResult(null); setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      if (!parsed.length) { setParseError('No rows found in that file.'); setRows([]); return; }
      setRows(parsed);
    } catch {
      setParseError('Could not read that file. Upload a .xlsx, .xls, or .csv file.');
      setRows([]);
    }
  };

  const submit = async () => {
    if (!validCount) return;
    setBusy(true); setParseError('');
    try {
      const validRows = rows.filter((row) => row.valid).map(({ full_name, phone, organisation }) => ({ full_name, phone, organisation }));
      const data = await api('/api/attendees-import', { method: 'POST', body: JSON.stringify({ event_id: eventId, attendees: validRows }) });
      setResult(data);
      onImported();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="modal modal-wide">
      <div className="flex items-start justify-between">
        <div><span className="eyebrow">Bulk registration</span><h2 className="mt-1 font-display text-2xl font-semibold">Import attendees from Excel</h2></div>
        <button className="table-action" onClick={onClose}><X size={18} /></button>
      </div>

      {!result && <>
        <p className="mt-3 text-sm leading-6 text-[#6a7772]">Upload a spreadsheet with <b>Full name</b>, <b>Phone</b>, and optionally <b>Union/Organisation</b> columns. Phone numbers must be valid Nigerian numbers.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Choose file</button>
          <button type="button" className="btn-ghost" onClick={downloadTemplate}><Download size={15} /> Download template</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ''; }} />
        </div>
        {fileName && <p className="mt-3 flex items-center gap-2 text-xs text-[#6a7772]"><FileSpreadsheet size={14} /> {fileName} · {rows.length} row{rows.length === 1 ? '' : 's'} found, {validCount} valid</p>}
        {parseError && <div className="error-box mt-4">{parseError}</div>}

        {rows.length > 0 && <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-[#e7ece9]">
          <table className="data-table">
            <thead><tr><th>Row</th><th>Full name</th><th>Phone</th><th>Union/Organisation</th><th>Status</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index}>
              <td>{index + 1}</td>
              <td><b>{row.full_name || '—'}</b></td>
              <td><b>{row.phone || '—'}</b></td>
              <td><b>{row.organisation || '—'}</b></td>
              <td>{row.valid ? <span className="status-present"><Check size={12} /> Valid</span> : <span className="status-pending"><AlertTriangle size={12} /> {row.reason}</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!validCount || busy} onClick={submit}>{busy ? <span className="loader-sm" /> : <Upload size={16} />} Import {validCount || ''} attendee{validCount === 1 ? '' : 's'}</button>
        </div>
      </>}

      {result && <div className="mt-5">
        <div className="flex items-center gap-3 rounded-xl bg-[#edf7f2] px-4 py-3 text-sm font-semibold text-[#087f5b]"><CheckCircle2 size={18} /> Imported {result.inserted} of {result.inserted + result.skipped} rows.</div>
        {result.skipped > 0 && <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-[#e7ece9]">
          <table className="data-table">
            <thead><tr><th>Row</th><th>Result</th></tr></thead>
            <tbody>{result.results.filter((row) => row.status === 'error').map((row) => <tr key={row.row}><td>{row.row}</td><td><span className="status-pending"><AlertTriangle size={12} /> {row.reason}</span></td></tr>)}</tbody>
          </table>
        </div>}
        <div className="mt-6 flex justify-end"><button type="button" className="btn-primary" onClick={onClose}>Done</button></div>
      </div>}
    </motion.div>
  </motion.div>;
}
