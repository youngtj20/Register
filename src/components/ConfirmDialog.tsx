import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', busy = false, onConfirm, onCancel }: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="modal max-w-sm">
      <div className="flex items-start justify-between"><h2 className="font-display text-xl font-semibold">{title}</h2><button className="table-action" onClick={onCancel}><X size={18} /></button></div>
      <div className="mt-3 text-sm leading-6 text-[#5c6963]">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>{busy ? <span className="loader-sm" /> : <Check size={16} />} {confirmLabel}</button>
      </div>
    </motion.div>
  </motion.div>;
}
