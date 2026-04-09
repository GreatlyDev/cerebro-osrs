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
    <Panel className="overflow-hidden border-osrs-border/45 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(15,13,11,0.98))]" tone="soft">
      <div className="relative space-y-5">
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-osrs-border/40 bg-black/20 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-osrs-gold-soft">
              <span className="h-2 w-2 rounded-full bg-osrs-gold/80" />
              {eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl font-display text-3xl leading-tight text-osrs-text md:text-4xl xl:text-[2.8rem]">
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
                className="rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.32))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                key={`${chip.label}-${chip.value}`}
              >
                <p className="text-[0.64rem] uppercase tracking-[0.18em] text-osrs-gold">
                  {chip.label}
                </p>
                <p className="mt-2 font-display text-lg text-osrs-text">{chip.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {children ? <div className="relative">{children}</div> : null}
      </div>
    </Panel>
  );
}
