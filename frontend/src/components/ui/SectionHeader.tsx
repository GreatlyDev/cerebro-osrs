type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/8 pb-4">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-osrs-gold">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-[1.1rem] font-bold uppercase leading-tight tracking-[0.08em] text-white md:text-[1.18rem]">
          {title}
        </h2>
        {subtitle ? <p className="max-w-2xl text-sm leading-6 text-osrs-text-soft/90">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
