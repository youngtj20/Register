import { useRef, useState } from 'react';
import { Copy, Download, ExternalLink, Printer, QrCode } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { formatLiveTime } from '../lib/datetime';
import useLiveClock from '../lib/useLiveClock';
import type { EventRecord } from '../types';
import QrCanvas from './QrCanvas';
import EventQrPoster from './EventQrPoster';

export default function EventQrCard({ event, onNotify }: { event: EventRecord; onNotify: (message: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const checkinUrl = `${window.location.origin}/self/${event.self_checkin_code}`;
  const now = useLiveClock();

  const copy = async () => {
    await navigator.clipboard.writeText(checkinUrl);
    onNotify('Self check-in link copied');
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-check-in-qr.png`;
    anchor.click();
  };

  return <section className="panel overflow-hidden">
    <div className="border-b border-[#e5ebe7] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><span className="eyebrow">Self check-in</span><h2 className="mt-1 font-display text-xl font-semibold text-[#17201d]">Event QR code</h2></div><div className="flex flex-col items-end gap-2"><span className="icon-chip"><QrCode size={18} /></span><span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecf8f2] px-2.5 py-1 text-[10px] font-bold text-[#087f5b]"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#19a974] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#19a974]" /></span>{formatLiveTime(now)}</span></div></div>
    </div>
    <div className="grid gap-6 p-5 sm:grid-cols-[164px_1fr] sm:p-6">
      <div className="mx-auto rounded-2xl border border-[#dfe8e3] bg-white p-2 shadow-[0_8px_30px_rgba(16,54,42,.08)] sm:mx-0">
        <QrCanvas ref={canvasRef} value={checkinUrl} size={280} logoSrc="/transporter.png" dark="#0c1f18" className="aspect-square w-full max-w-[148px] rounded-xl sm:max-w-none" />
      </div>
      <div className="flex min-w-0 flex-col justify-center"><p className="text-sm leading-6 text-[#63706b]">Place this code at the entrance or add it to event materials. Guests can scan, find their registration, and check in.</p><div className="mt-4 truncate rounded-xl bg-[#f1f5f3] px-3 py-2.5 font-mono text-xs text-[#52615b]">{checkinUrl}</div><div className="mt-4 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => setPosterOpen(true)}><Printer size={15} /> Print poster</button><button className="btn-secondary" onClick={copy}><Copy size={15} /> Copy link</button><button className="btn-secondary" onClick={download}><Download size={15} /> QR image</button><a className="btn-ghost" href={checkinUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Preview</a></div></div>
    </div>
    <AnimatePresence>{posterOpen && <EventQrPoster event={event} checkinUrl={checkinUrl} onClose={() => setPosterOpen(false)} />}</AnimatePresence>
  </section>;
}
