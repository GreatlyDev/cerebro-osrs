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
    <section className="border-b border-osrs-border/35 pb-10">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.38em] text-osrs-text-soft">
            Protocol v4.02 // Account status
          </p>
          <h1 className="mt-3 font-sans text-[4.2rem] font-black uppercase tracking-[0.08em] text-white md:text-[5rem] xl:text-[5.6rem]">
            Cerebro
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.22em] text-osrs-text-soft">
            {selectedAccountRsn ? `Account: ${selectedAccountRsn}` : "Account: workspace-wide"}
          </p>
        </div>
        <div className="flex gap-12 xl:gap-14">
          <div className="text-right">
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-osrs-text-soft">Combat level</p>
            <strong className="mt-2 block font-sans text-[3rem] font-bold tracking-[-0.04em] text-white">
              {combatLevel !== null ? combatLevel : "--"}
              {combatLevel !== null ? <span className="text-osrs-gold">.0</span> : null}
            </strong>
          </div>
          <div className="text-right">
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-osrs-text-soft">Total level</p>
            <strong className="mt-2 block font-sans text-[3rem] font-bold tracking-[-0.04em] text-white">
              {overallLevel !== null ? overallLevel : "--"}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
