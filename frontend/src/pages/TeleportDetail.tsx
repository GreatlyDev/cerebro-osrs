import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { TeleportRouteResponse } from "../types";

type TeleportDetailProps = {
  onBackToDashboard: () => void;
  onBackToTeleports: () => void;
  onReloadTeleport: () => void;
  selectedAccountRsn: string | null;
  teleportRoute: TeleportRouteResponse | null;
};

export function TeleportDetailView({
  onBackToDashboard,
  onBackToTeleports,
  onReloadTeleport,
  selectedAccountRsn,
  teleportRoute,
}: TeleportDetailProps) {
  if (!teleportRoute) {
    return (
      <Panel>
        <p className="text-sm leading-7 text-osrs-text-soft">No route loaded.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        action={
          <div className="flex gap-3">
            <Button onClick={onBackToTeleports} variant="secondary">All routes</Button>
            <Button onClick={onReloadTeleport}>Refresh route</Button>
          </div>
        }
        chips={[
          { label: "Account", value: selectedAccountRsn ?? "None selected" },
          { label: "Destination", value: teleportRoute.destination },
          { label: "Preference", value: teleportRoute.preference },
        ]}
        description={teleportRoute.destination}
        eyebrow="Teleport Detail"
        title={teleportRoute.recommended_route.method}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_24rem]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Recommended route"
            subtitle={teleportRoute.recommended_route.travel_notes}
            title="Primary travel plan"
          />
          <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-5 shadow-insetPanel">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-xs text-osrs-gold-soft">
                {teleportRoute.recommended_route.route_type}
              </span>
              <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft">
                {teleportRoute.recommended_route.convenience}
              </span>
            </div>
            {teleportRoute.recommended_route.requirements.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-7 text-osrs-text-soft">
                {teleportRoute.recommended_route.requirements.map((requirement) => (
                  <li key={requirement}>- {requirement}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader eyebrow="Fallbacks" title="Alternative routes" subtitle="Other ways into the destination when the primary method is missing or less ideal." />
          {teleportRoute.alternatives.length > 0 ? (
            teleportRoute.alternatives.map((option) => (
              <div
                className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel"
                key={option.method}
              >
                <strong className="block text-osrs-text">{option.method}</strong>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{option.travel_notes}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-osrs-text-soft">No fallback routes were needed for this destination.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
