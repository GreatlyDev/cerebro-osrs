import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
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
    return (
      <Panel>
        <p className="text-sm leading-7 text-osrs-text-soft">No gear recommendation loaded.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        action={
          <div className="flex gap-3">
            <Button onClick={onBackToGear} variant="secondary">All gear</Button>
            <Button onClick={onReloadGear}>Refresh upgrades</Button>
          </div>
        }
        chips={[
          { label: "Account", value: selectedAccountRsn ?? "None selected" },
          { label: "Combat style", value: gearRecommendations.combat_style },
          { label: "Budget tier", value: gearRecommendations.budget_tier },
        ]}
        description={`${gearRecommendations.combat_style} upgrades`}
        eyebrow="Gear Detail"
        title={`${gearRecommendations.combat_style} loadout ladder`}
      >
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <button
            className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5"
            onClick={onBackToDashboard}
            type="button"
          >
            Dashboard
          </button>
        </div>
      </PageHero>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <Panel className="space-y-4">
          <SectionHeader eyebrow="Upgrade ladder" title="Slot-by-slot suggestions" />
          <div className="grid gap-4">
            {gearRecommendations.recommendations.map((item) => (
              <div
                className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-5 shadow-insetPanel"
                key={`${item.slot}-${item.item_name}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block font-display text-2xl text-osrs-text">{item.item_name}</strong>
                    <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{item.upgrade_reason}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft">
                      {item.slot}
                    </span>
                    <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-xs text-osrs-gold-soft">
                      {item.priority}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft">
                    {item.estimated_cost}
                  </span>
                  <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft">
                    {item.budget_tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Loadout frame"
            subtitle="A compact read of the lane this upgrade ladder is optimized around."
            title="Current filter"
          />
          <div className="grid gap-3">
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Selected account</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{selectedAccountRsn ?? "none selected"}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Combat style</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{gearRecommendations.combat_style}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Budget tier</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{gearRecommendations.budget_tier}</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
