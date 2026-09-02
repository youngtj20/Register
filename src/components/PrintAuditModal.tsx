import { useState } from 'react';
import { motion } from 'framer-motion';
import { Printer, X } from 'lucide-react';
import AuditLogPrintSheet from './AuditLogPrintSheet';
import PrintPortal from './PrintPortal';
import type { Checkin, CheckinsPage, EventRecord } from '../types';

type Scope = '30' | '50' | '100' | '200' | 'all';

export default function PrintAuditModal({ event, query, total, api, selectedRecords, onClose, onMarked }: {
  event: EventRecord;
  query: string;
  total: number;
  api: (url: string, options?: RequestInit) => Promise<CheckinsPage>;
  selectedRecords?: Checkin[];
  onClose: () => void;
  onMarked: () => void;
}) {
  const isSelectionMode = Boolean(selectedRecords && selectedRecords.length);
  const [scope, setScope] = useState<Scope>('30');
  const [markPrinted, setMarkPrinted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<Checkin[] | null>(isSelectionMode ? selectedRecords! : null);

  const countFor = (value: Scope) => value === 'all' ? Math.max(total, 1) : Number(value);
  const filterLabel = isSelectionMode
    ? `${selectedRecords!.length} manually selected record${selectedRecords!.length === 1 ? '' : 's'}`
    : query ? `Filtered by "${query}"` : 'All checked-in participants';

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const data = await api(`/api/checkins?eventId=${event.id}&q=${encodeURIComponent(query)}&page=1&pageSize=${countFor(scope)}`);
      setRecords(data.results);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load records.'); }
    finally { setBusy(false); }
  };

  const doPrint = async () => {
    if (!records) return;
    setBusy(true); setError('');
    try {
      if (markPrinted) {
        await api('/api/checkins-print', { method: 'POST', body: JSON.stringify({ eventId: event.id, ids: records.map((r) => r.id), printed: true }) });
        onMarked();
      }
      window.setTimeout(() => window.print(), 150);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to mark records as printed.'); }
    finally { setBusy(false); }
  };

  return <>
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="modal modal-wide max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div><span className="eyebrow">Attendance register</span><h2 className="mt-1 font-display text-2xl font-semibold">{records ? 'Preview & print' : 'Print options'}</h2></div>
          <button className="table-action" onClick={onClose}><X size={18} /></button>
        </div>

        {!records && <div className="mt-5">
          <label className="field-label">How many records to print?</label>
          <select className="input mt-2" value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            <option value="30">Current page (30)</option>
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="200">200 records</option>
            <option value="all">All matching ({total})</option>
          </select>
          <label className="mt-4 flex items-center gap-2 text-sm text-[#3c4844]"><input type="checkbox" checked={markPrinted} onChange={(e) => setMarkPrinted(e.target.checked)} /> Mark these records as printed</label>
          {error && <div className="error-box mt-3">{error}</div>}
          <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" disabled={busy} onClick={generate}>{busy ? <span className="loader-sm" /> : <Printer size={16} />} Preview</button></div>
        </div>}

        {records && <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f5f8f6] px-4 py-3 text-sm">
            <span>{records.length} record{records.length === 1 ? '' : 's'} ready to print{markPrinted ? ' · will be marked as printed' : ''}</span>
            <div className="flex gap-2">{!isSelectionMode && <button className="btn-secondary" onClick={() => setRecords(null)}>Back</button>}<button className="btn-primary" disabled={busy} onClick={doPrint}>{busy ? <span className="loader-sm" /> : <Printer size={16} />} Print now</button></div>
          </div>
          {error && <div className="error-box mb-3">{error}</div>}
          <AuditLogPrintSheet event={event} records={records} filterLabel={filterLabel} />
        </div>}
      </motion.div>
    </motion.div>
    {records && <PrintPortal><AuditLogPrintSheet event={event} records={records} filterLabel={filterLabel} /></PrintPortal>}
  </>;
}
