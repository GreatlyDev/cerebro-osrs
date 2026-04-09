type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="cerebro-hover rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.34))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[0.62rem] uppercase tracking-[0.2em] text-osrs-gold">{label}</p>
      <strong className="mt-2 block font-display text-[2rem] font-semibold leading-none text-osrs-text">{value}</strong>
      <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{hint}</p>
    </div>
  );
}
