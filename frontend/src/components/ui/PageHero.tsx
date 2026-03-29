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
    <Panel className="overflow-hidden" tone="hero">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(217,191,134,0.12),transparent_72%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-osrs-border-light/40 bg-osrs-gold/8 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-osrs-gold-soft">
              <span className="h-2 w-2 rounded-full bg-osrs-gold/80 shadow-[0_0_12px_rgba(200,164,90,0.45)]" />
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
                className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.52),rgba(24,19,15,0.95))] px-4 py-3 shadow-insetPanel"
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
