import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import type { GearRecommendationResponse } from "../types";

type GearViewProps = {
  busyAction: string | null;
  gearBudgetTier: string;
  gearCombatStyle: string;
  gearCurrentItems: string;
  gearRecommendations: GearRecommendationResponse | null;
  onAskAdvisor: (prompt: string) => void;
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
  onAskAdvisor,
  onLoadGear,
  onOpenDetail,
  selectedAccountRsn,
  setGearBudgetTier,
  setGearCombatStyle,
  setGearCurrentItems,
}: GearViewProps) {
  const selectClassName =
    "border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm uppercase tracking-[0.08em] text-osrs-text outline-none focus:border-osrs-gold/40";

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Gear // Upgrade ladder
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              Loadout upgrades with account-aware filtering
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Tell Cerebro what combat lane and budget you care about, then let the live backend surface cleaner
              upgrade ladders with owned-gear filtering already applied.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            <select
              className={selectClassName}
              onChange={(event) => setGearCombatStyle(event.target.value)}
              value={gearCombatStyle}
            >
              <option value="melee">Melee</option>
              <option value="magic">Magic</option>
              <option value="ranged">Ranged</option>
            </select>
            <select
              className={selectClassName}
              onChange={(event) => setGearBudgetTier(event.target.value)}
              value={gearBudgetTier}
            >
              <option value="budget">Budget</option>
              <option value="midgame">Midgame</option>
            </select>
            <input
              className="border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
              onChange={(event) => setGearCurrentItems(event.target.value)}
              placeholder="Owned gear, comma-separated"
              value={gearCurrentItems}
            />
            <Button onClick={onLoadGear}>
              {busyAction === "gear" ? "Loading..." : "Get upgrades"}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                onAskAdvisor(`What gear upgrade matters most for my ${gearCombatStyle} setup right now?`)
              }
              variant="secondary"
            >
              Ask Cerebro about this lane
            </Button>
          </div>
        </div>
      </section>

      {!selectedAccountRsn ? (
        <section className="border border-white/8 bg-[#101010] px-5 py-5 text-sm leading-7 text-osrs-text-soft">
          Gear planning works best with a synced account. Without one, Cerebro can still generate a lane, but it cannot
          ground the upgrades against your live progression state.
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Active account</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "Workspace-wide"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Combat lane</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{gearCombatStyle}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Budget tier</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{gearBudgetTier}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Upgrade ladder</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Live recommendations</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              These cards stay grounded in the current account and your owned-gear filter, so the advice does not keep surfacing stale items.
            </p>
          </div>

          {gearRecommendations ? (
            <div className="grid gap-3">
              {gearRecommendations.recommendations.map((item) => (
                <div className="border border-white/8 bg-[#111111] p-4" key={item.item_name}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                          {item.priority} priority
                        </span>
                        <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                          {item.slot}
                        </span>
                        <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                          {item.estimated_cost}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl text-white">{item.item_name}</h3>
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
            <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
              No gear recommendations yet. Pick a combat lane, set a budget, and let Cerebro build the first upgrade
              path for this account.
            </div>
          )}
        </section>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Planner context</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Current filter</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              Keep this side panel for the quick read, then jump into the detail page when you want a fuller upgrade workspace.
            </p>
          </div>

          <div className="space-y-3 text-sm text-osrs-text-soft">
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Account</strong>
              <p className="mt-2">{selectedAccountRsn ?? "workspace-wide read"}</p>
            </div>
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Current lane</strong>
              <p className="mt-2">{gearCombatStyle} | {gearBudgetTier}</p>
            </div>
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Owned gear filter</strong>
              <p className="mt-2">{gearCurrentItems || "No manual owned-gear filter entered yet."}</p>
            </div>
          </div>

          {gearRecommendations ? (
            <div className="mt-4 space-y-3">
              <Button
                className="w-full"
                onClick={() =>
                  onAskAdvisor(
                    `What should I prioritize in my ${gearCombatStyle} gear progression after ${gearRecommendations.recommendations[0]?.item_name ?? "this upgrade"}?`,
                  )
                }
                variant="secondary"
              >
                Ask about this upgrade path
              </Button>
              <Button className="w-full" onClick={onOpenDetail} variant="secondary">
                Open gear detail page
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
