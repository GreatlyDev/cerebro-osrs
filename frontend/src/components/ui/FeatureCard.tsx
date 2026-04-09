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
  accent = "from-[rgba(212,175,55,0.08)] to-transparent",
  meta,
  actionLabel,
  onAction,
  badge,
  footer,
}: FeatureCardProps) {
  return (
    <Panel
      tone="soft"
      className={`cerebro-hover overflow-hidden border-white/8 bg-gradient-to-br ${accent}`}
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-osrs-gold">{eyebrow}</p>
            <h3 className="mt-2 font-display text-[0.98rem] font-bold uppercase tracking-[0.06em] text-white">{title}</h3>
          </div>
          {badge ? (
            <span className="border border-white/8 bg-black/30 px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-[0.92rem] leading-6 text-osrs-text-soft">{summary}</p>
        {meta ? <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-osrs-text-soft/80">{meta}</p> : null}
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
