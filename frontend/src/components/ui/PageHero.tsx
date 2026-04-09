import type { ReactNode } from "react";

import { Panel } from "./Panel";

type HeroChip = {
  label: string;
  value: string;
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  chips?: HeroChip[];
  children?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  action,
  chips = [],
  children,
}: PageHeroProps) {
  return (
    <Panel className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_78%_24%,rgba(212,175,55,0.06),transparent_30%),linear-gradient(180deg,#0b0b0b_0%,#101010_100%)]" tone="soft">
      <div className="relative space-y-5">
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 border border-osrs-gold/70 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.28em] text-osrs-gold-soft">
              <span className="h-2 w-2 rounded-full bg-osrs-gold/80" />
              {eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl font-display text-3xl font-black uppercase leading-[0.98] tracking-[0.08em] text-white md:text-4xl xl:text-[2.8rem]">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-osrs-text-soft md:text-[0.96rem]">
                {description}
              </p>
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {chips.length > 0 ? (
          <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {chips.map((chip) => (
              <div
                className="border border-white/8 bg-[#111111] px-4 py-3"
                key={`${chip.label}-${chip.value}`}
              >
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">
                  {chip.label}
                </p>
                <p className="mt-2 font-display text-lg font-bold uppercase text-white">{chip.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {children ? <div className="relative">{children}</div> : null}
      </div>
    </Panel>
  );
}
