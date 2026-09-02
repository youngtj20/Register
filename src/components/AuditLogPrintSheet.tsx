import { formatEventDateTime, formatEventTime } from '../lib/datetime';
import type { Checkin, EventRecord } from '../types';

export default function AuditLogPrintSheet({ event, records, filterLabel }: { event: EventRecord; records: Checkin[]; filterLabel: string }) {
  const generatedAt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());

  return <div className="print-a4 relative overflow-hidden bg-white text-[#17201d]">
    <img src="/transporter.png" alt="" aria-hidden="true" className="print-watermark pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.06] grayscale" />
    <div className="relative z-10">
    <div className="flex items-center justify-between gap-4 border-b-2 border-[#087f5b] pb-4">
      <div className="flex items-center gap-3">
        <img src="/transporter.png" alt="" className="h-14 w-14 shrink-0 rounded-full" />
        <div className="leading-tight">
          <div className="font-display text-base font-bold">Transporters for Tinubu/Shettima 2027</div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-[#087f5b]">Wheels of progress: moving Nigeria forward</div>
        </div>
      </div>
      <div className="text-right leading-tight">
        <div className="font-display text-lg font-bold">Attendance Register</div>
        <div className="mt-0.5 text-xs text-[#5c6963]">{event.name}</div>
        <div className="mt-0.5 text-[11px] text-[#8a9590]">{formatEventDateTime(event.starts_at)} · {event.venue}</div>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5c6963]">
      <span>{filterLabel}</span>
      <span>Generated {generatedAt} · {records.length} record{records.length === 1 ? '' : 's'}</span>
    </div>
    <table className="mt-4 w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-[#eaf7f1] text-left text-[10px] font-bold uppercase tracking-wide text-[#087f5b]">
          <th className="border border-[#c9ddd3] px-2 py-2 w-8">#</th>
          <th className="border border-[#c9ddd3] px-2 py-2">Full name</th>
          <th className="border border-[#c9ddd3] px-2 py-2">Phone number</th>
          <th className="border border-[#c9ddd3] px-2 py-2">Union/Organisation</th>
          <th className="border border-[#c9ddd3] px-2 py-2 w-24">Checked in</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, index) => <tr key={record.id}>
          <td className="border border-[#e3e9e6] px-2 py-1.5 text-[#8a9590]">{index + 1}</td>
          <td className="border border-[#e3e9e6] px-2 py-1.5 font-semibold">{record.attendee?.full_name}</td>
          <td className="border border-[#e3e9e6] px-2 py-1.5">{record.attendee?.phone}</td>
          <td className="border border-[#e3e9e6] px-2 py-1.5">{record.attendee?.organisation || '—'}</td>
          <td className="border border-[#e3e9e6] px-2 py-1.5">{formatEventTime(record.checked_in_at)}</td>
        </tr>)}
      </tbody>
    </table>
    <div className="mt-6 text-center text-[10px] text-[#a7b0ab]">Transporters for Tinubu/Shettima 2027 · Wheels of progress: moving Nigeria forward</div>
    </div>
  </div>;
}
