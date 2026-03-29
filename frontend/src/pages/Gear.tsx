import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { GearRecommendationResponse } from "../types";

type GearViewProps = {
  busyAction: string | null;
  gearBudgetTier: string;
  gearCombatStyle: string;
  gearCurrentItems: string;
  gearRecommendations: GearRecommendationResponse | null;
  onLoadGear: () => void;
  onOpenDetail: () => void;
  selectedAccountRsn: string | null;
  setGearBudgetTier: Dispatch<SetStateAction<string>>;
  setGearCombatStyle: Dispatch<SetStateAction<string>>;
  setGearCurrentItems: Dispatch<SetStateAction<string>>;
};

export function GearView({
  busyAction,
  gearBudgetTier,
  gearCombatStyle,
  gearCurrentItems,
  gearRecommendations,
  onLoadGear,
  onOpenDetail,
  selectedAccountRsn,
  setGearBudgetTier,
  setGearCombatStyle,
  setGearCurrentItems,
}: GearViewProps) {
  return (
    <div className="space-y-6">
      <Panel tone="hero">
        <SectionHeader
          eyebrow="Gear Optimizer"
          subtitle="Tell Cerebro what combat lane and budget you care about, then let the live backend surface cleaner upgrade ladders."
          title="Loadout upgrades with account-aware filtering"
        />
        <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <select
            className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
            onChange={(event) => setGearCombatStyle(event.target.value)}
            value={gearCombatStyle}
          >
            <option value="melee">Melee</option>
            <option value="magic">Magic</option>
            <option value="ranged">Ranged</option>
          </select>
          <select
            className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
            onChange={(event) => setGearBudgetTier(event.target.value)}
            value={gearBudgetTier}
          >
            <option value="budget">Budget</option>
            <option value="midgame">Midgame</option>
          </select>
          <input
            className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
            onChange={(event) => setGearCurrentItems(event.target.value)}
            placeholder="Owned gear, comma-separated"
            value={gearCurrentItems}
          />
          <Button onClick={onLoadGear}>
            {busyAction === "gear" ? "Loading..." : "Get upgrades"}
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Upgrade ladder"
            subtitle="These cards stay grounded in the current account and your owned-gear filter, so the advice doesn’t keep surfacing stale items."
            title="Live recommendations"
          />
          {gearRecommendations ? (
            <div className="grid gap-3">
              {gearRecommendations.recommendations.map((item) => (
                <div
                  className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                  key={item.item_name}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                          {item.priority} priority
                        </span>
                        <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                          {item.slot}
                        </span>
                        <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                          {item.estimated_cost}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl text-osrs-text">{item.item_name}</h3>
                      <p className="text-sm leading-7 text-osrs-text-soft">{item.upgrade_reason}</p>
                      {item.requirements.length > 0 ? (
                        <p className="text-xs uppercase tracking-[0.16em] text-osrs-text-soft/80">
                          Requirements: {item.requirements.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              No gear recommendations yet. Pick a style, set a budget, and let Cerebro build an upgrade lane for the current account.
            </div>
          )}
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Planner context"
            subtitle="Keep this side panel for the quick read, then jump into the detail page when you want a fuller upgrade workspace."
            title="Current filter"
          />
          <div className="space-y-3 text-sm text-osrs-text-soft">
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Account</strong>
              <p className="mt-2">{selectedAccountRsn ?? "none selected"}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Current lane</strong>
              <p className="mt-2">{gearCombatStyle} | {gearBudgetTier}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Owned gear filter</strong>
              <p className="mt-2">{gearCurrentItems || "No manual owned-gear filter entered yet."}</p>
            </div>
          </div>
          {gearRecommendations ? (
            <Button className="w-full" onClick={onOpenDetail} variant="secondary">
              Open gear detail page
            </Button>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
