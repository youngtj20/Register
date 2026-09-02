import { useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock3, Download, MapPin, Printer, X } from 'lucide-react';
import { formatEventDateLong, formatEventTime, formatLiveDateTime } from '../lib/datetime';
import useLiveClock from '../lib/useLiveClock';
import type { EventRecord } from '../types';
import QrCanvas from './QrCanvas';

export default function EventQrPoster({ event, checkinUrl, onClose }: { event: EventRecord; checkinUrl: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const now = useLiveClock();

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-poster-qr.png`;
    anchor.click();
  };

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="w-full max-w-lg">
      <div className="no-print mb-3 flex flex-wrap justify-end gap-2">
        <button className="btn-secondary bg-white" onClick={download}><Download size={15} /> Download PNG</button>
        <button className="btn-primary" onClick={() => window.print()}><Printer size={15} /> Print poster</button>
        <button className="table-action bg-white" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="no-print mb-3 flex items-center justify-center gap-2 rounded-full bg-[#073d2e] px-4 py-2 text-xs font-bold text-emerald-100 shadow-[0_10px_30px_rgba(6,61,46,.18)]">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ff5bd] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ff5bd]" /></span>
        Live now · {formatLiveDateTime(now)}
      </div>
      <div className="qr-poster-print overflow-hidden rounded-[28px] border border-[#dfe8e3] bg-white p-6 text-center shadow-[0_30px_80px_rgba(5,29,21,.25)] sm:p-10">
        <div className="flex items-center justify-center gap-3">
          <img src="/transporter.png" alt="Transporters for Tinubu/Shettima 2027" className="h-12 w-12 shrink-0 rounded-full sm:h-14 sm:w-14" />
          <div className="text-left leading-tight">
            <div className="font-display text-xs font-bold text-[#17201d] sm:text-sm">Transporters for Tinubu/Shettima 2027</div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#087f5b] sm:text-[9px]">Wheels of progress: moving Nigeria forward</div>
          </div>
        </div>
        <div className="mx-auto my-5 h-px w-20 bg-[#e1e9e4] sm:my-6" />
        <span className="inline-flex items-center gap-2 rounded-full bg-[#ecf8f2] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-[#087f5b] sm:text-xs">Scan to check in</span>
        <h1 className="mt-4 font-display text-xl font-semibold leading-tight text-[#17201d] sm:text-3xl">{event.name}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#5c6963] sm:text-sm">
          <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {formatEventDateLong(event.starts_at)}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={14} /> {formatEventTime(event.starts_at)}</span>
          <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.venue}</span>
        </div>
        <div className="qr-frame mx-auto mt-7 w-fit rounded-[20px] border-2 border-[#e1e9e4] bg-white p-3 sm:mt-8 sm:p-4">
          <span /><span /><span /><span />
          <QrCanvas ref={canvasRef} value={checkinUrl} size={640} logoSrc="/transporter.png" dark="#0c1f18" className="block h-56 w-56 sm:h-80 sm:w-80" />
        </div>
        <p className="mx-auto mt-5 max-w-xs text-xs leading-5 text-[#8a9590]">Open your phone's camera, point it at the code, and tap the link to search your name and check in.</p>
        <div className="mx-auto mt-4 max-w-sm truncate rounded-lg bg-[#f1f5f3] px-3 py-2 font-mono text-[11px] text-[#63706b]">{checkinUrl}</div>
      </div>
    </motion.div>
  </motion.div>;
}
