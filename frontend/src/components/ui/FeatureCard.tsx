import type { ReactNode } from "react";

import { Button } from "./Button";
import { Panel } from "./Panel";

type FeatureCardProps = {
  title: string;
  summary: string;
  eyebrow: string;
  accent?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: string;
  footer?: ReactNode;
};

export function FeatureCard({
  title,
  summary,
  eyebrow,
  accent = "from-osrs-gold/20 to-osrs-panel-2/10",
  meta,
  actionLabel,
  onAction,
  badge,
  footer,
}: FeatureCardProps) {
  return (
    <Panel
      tone="soft"
      className={`cerebro-hover overflow-hidden border-osrs-border/70 bg-gradient-to-br ${accent}`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">{eyebrow}</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-osrs-text">{title}</h3>
          </div>
          {badge ? (
            <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-osrs-text-soft">{summary}</p>
        {meta ? <p className="text-xs uppercase tracking-[0.18em] text-osrs-text-soft/80">{meta}</p> : null}
        {footer}
        {actionLabel && onAction ? (
          <Button className="w-full justify-center" onClick={onAction} variant="secondary">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
