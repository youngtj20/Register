import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { formatLiveTime } from '../lib/datetime';
import { isValidNigerianPhone } from '../lib/phone';
import useLiveClock from '../lib/useLiveClock';
import type { Attendee } from '../types';

const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

export default function SelfCheckInConfirm({ attendee, busy, error, onCancel, onConfirm }: {
  attendee: Attendee;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (phone: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const valid = isValidNigerianPhone(phone);
  const now = useLiveClock();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    onConfirm(phone);
  };

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <motion.div initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(5,29,21,.28)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b5b46] to-[#052c22] px-6 pb-8 pt-6 text-center text-white">
        <button type="button" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" onClick={onCancel}><X size={17} /></button>
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute -left-10 bottom-[-60px] h-32 w-32 rounded-full border border-white/10" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-100">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ff5bd] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ff5bd]" /></span>
          Checking in now · {formatLiveTime(now)}
        </span>
        <motion.span initial={{ scale: .7 }} animate={{ scale: 1 }} className="relative mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full bg-white/10 text-xl font-bold tracking-wide ring-4 ring-white/[0.06]">{initials(attendee.full_name)}</motion.span>
        <h2 className="relative mt-4 font-display text-xl font-semibold leading-tight">{attendee.full_name}</h2>
        {attendee.organisation && <p className="relative mt-1 text-sm text-emerald-100/70">{attendee.organisation}</p>}
      </div>
      <form onSubmit={submit} className="p-6 sm:p-7">
        <div className="text-center"><h3 className="font-display text-base font-bold text-[#17201d]">Confirm it's you</h3><p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-5 text-[#6c7873]">Enter the phone number on this registration to complete your check-in.</p></div>
        <input autoFocus type="tel" inputMode="tel" autoComplete="tel" className="input mt-5 h-14 text-center text-lg font-semibold tracking-wide" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" />
        {error && <div className="error-box mt-3">{error}</div>}
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-secondary flex-1 justify-center" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary flex-1 justify-center" disabled={!valid || busy}>{busy ? <span className="loader-sm" /> : <Check size={16} />} Check me in</button>
        </div>
      </form>
    </motion.div>
  </motion.div>;
}
