type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="cerebro-hover rounded-[18px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(58,45,33,0.86),rgba(31,24,18,0.98))] px-4 py-4 shadow-insetPanel">
      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">{label}</p>
      <strong className="mt-2 block font-display text-2xl font-semibold text-osrs-text">{value}</strong>
      <p className="mt-1 text-sm text-osrs-text-soft">{hint}</p>
    </div>
  );
}
