export default function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <img src="/transporter.png" alt="Transporters for Tinubu/Shettima 2027" className="h-11 w-11 shrink-0 rounded-full object-contain" />
    {!compact && <div className="min-w-0 leading-tight"><div className={`font-display text-[13px] font-semibold tracking-[-0.01em] ${light ? 'text-white' : 'text-[#17201d]'}`}>Transporters for Tinubu/Shettima 2027</div><div className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${light ? 'text-emerald-100/70' : 'text-[#718078]'}`}>Wheels of progress: moving Nigeria forward</div></div>}
  </div>;
}
