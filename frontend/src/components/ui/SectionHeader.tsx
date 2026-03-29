type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="font-sans text-[0.68rem] uppercase tracking-[0.24em] text-osrs-gold">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-xl font-semibold text-osrs-text">{title}</h2>
        {subtitle ? <p className="max-w-2xl text-sm leading-6 text-osrs-text-soft">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
