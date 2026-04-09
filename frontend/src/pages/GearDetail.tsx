import { Button } from "../components/ui/Button";
import type { GearRecommendationResponse } from "../types";

type GearDetailProps = {
  gearRecommendations: GearRecommendationResponse | null;
  onBackToDashboard: () => void;
  onBackToGear: () => void;
  onReloadGear: () => void;
  selectedAccountRsn: string | null;
};

export function GearDetailView({
  gearRecommendations,
  onBackToDashboard,
  onBackToGear,
  onReloadGear,
  selectedAccountRsn,
}: GearDetailProps) {
  if (!gearRecommendations) {
    return <div className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">No gear recommendation loaded.</div>;
  }

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Gear // Detail view
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              {gearRecommendations.combat_style} loadout ladder
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Slot-by-slot suggestions for the current gear lane, grounded in the selected account and the current budget tier.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onBackToGear} variant="secondary">All gear</Button>
            <Button onClick={onReloadGear}>Refresh upgrades</Button>
            <Button onClick={onBackToDashboard} variant="secondary">Dashboard</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Account</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "None selected"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Combat style</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{gearRecommendations.combat_style}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Budget tier</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{gearRecommendations.budget_tier}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Upgrade ladder</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Slot-by-slot suggestions</h2>
          </div>
          <div className="grid gap-4">
            {gearRecommendations.recommendations.map((item) => (
              <div className="border border-white/8 bg-[#111111] p-5" key={`${item.slot}-${item.item_name}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block font-display text-2xl text-white">{item.item_name}</strong>
                    <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{item.upgrade_reason}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft">{item.slot}</span>
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-gold-soft">{item.priority}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft">{item.estimated_cost}</span>
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft">{item.budget_tier}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Loadout frame</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Current filter</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">A compact read of the lane this upgrade ladder is optimized around.</p>
          </div>
          <div className="grid gap-3">
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Selected account</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{selectedAccountRsn ?? "none selected"}</p>
            </div>
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Combat style</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{gearRecommendations.combat_style}</p>
            </div>
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Budget tier</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{gearRecommendations.budget_tier}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
