import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { TeleportRouteResponse } from "../types";

type TeleportsViewProps = {
  busyAction: string | null;
  onLoadTeleport: () => void;
  onOpenDetail: () => void;
  selectedAccountRsn: string | null;
  setTeleportDestination: Dispatch<SetStateAction<string>>;
  setTeleportPreference: Dispatch<SetStateAction<string>>;
  teleportDestination: string;
  teleportPreference: string;
  teleportRoute: TeleportRouteResponse | null;
};

export function TeleportsView({
  busyAction,
  onLoadTeleport,
  onOpenDetail,
  selectedAccountRsn,
  setTeleportDestination,
  setTeleportPreference,
  teleportDestination,
  teleportPreference,
  teleportRoute,
}: TeleportsViewProps) {
  return (
    <div className="space-y-6">
      <PageHero
        chips={[
          { label: "Active account", value: selectedAccountRsn ?? "None selected" },
          { label: "Destination", value: teleportDestination },
          { label: "Route preference", value: teleportPreference },
        ]}
        description="When movement friction is the blocker, use this surface to ask Cerebro for the cleanest route into the content you care about."
        eyebrow="Teleport Planner"
        title="Unlock-aware route planning"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
            onChange={(event) => setTeleportDestination(event.target.value)}
            value={teleportDestination}
          >
            <option value="fossil island">Fossil Island</option>
            <option value="barrows">Barrows</option>
            <option value="wintertodt">Wintertodt</option>
            <option value="fairy ring network">Fairy Ring Network</option>
          </select>
          <select
            className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
            onChange={(event) => setTeleportPreference(event.target.value)}
            value={teleportPreference}
          >
            <option value="balanced">Balanced</option>
            <option value="convenience">Convenience</option>
            <option value="low-cost">Low Cost</option>
          </select>
          <Button onClick={onLoadTeleport}>
            {busyAction === "teleport" ? "Routing..." : "Find route"}
          </Button>
        </div>
      </PageHero>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Recommended route"
            subtitle="This is already live and can take your tracked unlock state into account before it falls back to more generic routes."
            title="Current travel plan"
          />
          {teleportRoute ? (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(60,46,30,0.84),rgba(31,24,18,0.98))] p-5 shadow-insetPanel">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                    {teleportRoute.preference}
                  </span>
                  <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                    {teleportRoute.recommended_route.route_type}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl text-osrs-text">{teleportRoute.recommended_route.method}</h3>
                <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                  {teleportRoute.recommended_route.travel_notes}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-osrs-text-soft/80">
                  Requirements: {teleportRoute.recommended_route.requirements.join(", ") || "None"}
                </p>
              </div>

              {teleportRoute.alternatives.length > 0 ? (
                <div className="grid gap-3">
                  {teleportRoute.alternatives.map((option) => (
                    <div
                      className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                      key={option.method}
                    >
                      <strong className="block text-base text-osrs-text">{option.method}</strong>
                      <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{option.travel_notes}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              No route calculated yet. Pick a destination and run the route finder to see travel options for your current account context.
            </div>
          )}
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Route context"
            subtitle="This keeps the short read visible even before you jump into the dedicated route page."
            title="Current request"
          />
          <div className="space-y-3 text-sm text-osrs-text-soft">
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Account</strong>
              <p className="mt-2">{selectedAccountRsn ?? "none selected"}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Destination</strong>
              <p className="mt-2">{teleportDestination}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
              <strong className="block text-osrs-text">Preference</strong>
              <p className="mt-2">{teleportPreference}</p>
            </div>
          </div>
          {teleportRoute ? (
            <Button className="w-full" onClick={onOpenDetail} variant="secondary">
              Open teleport detail page
            </Button>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
