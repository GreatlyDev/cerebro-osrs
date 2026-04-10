type HeroPanelProps = {
  selectedAccountRsn: string | null;
  combatLevel: number | null;
  overallLevel: number | null;
  questPoints: string;
  bankValue: string;
};

export function HeroPanel({
  selectedAccountRsn,
  combatLevel,
  overallLevel,
  questPoints: _questPoints,
  bankValue: _bankValue,
}: HeroPanelProps) {
  return (
    <section className="border-b border-white/8 pb-8">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
            Protocol v4.02 // Account status
          </p>
          <h1 className="mt-2 font-display text-[3.8rem] font-black uppercase tracking-[0.14em] text-white md:text-[4.8rem] xl:text-[5.5rem]">
            Cerebro
          </h1>
          <p className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.34em] text-osrs-text-soft">
            {selectedAccountRsn ? `Account: ${selectedAccountRsn}` : "Account: workspace-wide"}
          </p>
        </div>
        <div className="flex gap-8 xl:gap-12">
          <div className="text-right">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-osrs-text-soft">Combat level</p>
            <strong className="mt-1.5 block font-display text-[2.6rem] font-bold tracking-[-0.05em] text-white">
              {combatLevel !== null ? combatLevel : "--"}
              {combatLevel !== null ? <span className="text-osrs-gold">.0</span> : null}
            </strong>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-osrs-text-soft">Total level</p>
            <strong className="mt-1.5 block font-display text-[2.6rem] font-bold tracking-[-0.05em] text-white">
              {overallLevel !== null ? overallLevel : "--"}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
