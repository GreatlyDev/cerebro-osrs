import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import type { TeleportRouteResponse } from "../types";

type TeleportsViewProps = {
  busyAction: string | null;
  onAskAdvisor: (prompt: string) => void;
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
  onAskAdvisor,
  onLoadTeleport,
  onOpenDetail,
  selectedAccountRsn,
  setTeleportDestination,
  setTeleportPreference,
  teleportDestination,
  teleportPreference,
  teleportRoute,
}: TeleportsViewProps) {
  const selectClassName =
    "border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm uppercase tracking-[0.08em] text-osrs-text outline-none focus:border-osrs-gold/40";

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Teleports // Route planning
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              Unlock-aware route planning
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              When movement friction is the blocker, use this surface to ask Cerebro for the cleanest route into the content you care about.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select
              className={selectClassName}
              onChange={(event) => setTeleportDestination(event.target.value)}
              value={teleportDestination}
            >
              <option value="fossil island">Fossil Island</option>
              <option value="barrows">Barrows</option>
              <option value="wintertodt">Wintertodt</option>
              <option value="fairy ring network">Fairy Ring Network</option>
            </select>
            <select
              className={selectClassName}
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
          <div className="flex justify-end">
            <Button
              onClick={() =>
                onAskAdvisor(`Is ${teleportDestination} worth unlocking for this account right now?`)
              }
              variant="secondary"
            >
              Ask Cerebro about this route
            </Button>
          </div>
        </div>
      </section>

      {!selectedAccountRsn ? (
        <section className="border border-white/8 bg-[#101010] px-5 py-5 text-sm leading-7 text-osrs-text-soft">
          Route planning is strongest when Cerebro can see your actual unlocks. Without a synced account, this page will
          still suggest routes, but they will be broader and less personalized.
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Active account</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "Workspace-wide"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Destination</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{teleportDestination}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Route preference</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{teleportPreference}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Recommended route</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Current travel plan</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              This is already live and can take your tracked unlock state into account before it falls back to more generic routes.
            </p>
          </div>

          {teleportRoute ? (
            <div className="space-y-4">
              <div className="border border-white/8 bg-[#111111] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                    {teleportRoute.preference}
                  </span>
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                    {teleportRoute.recommended_route.route_type}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl text-white">{teleportRoute.recommended_route.method}</h3>
                <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{teleportRoute.recommended_route.travel_notes}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-osrs-text-soft/80">
                  Requirements: {teleportRoute.recommended_route.requirements.join(", ") || "None"}
                </p>
              </div>

              {teleportRoute.alternatives.length > 0 ? (
                <div className="grid gap-3">
                  {teleportRoute.alternatives.map((option) => (
                    <div className="border border-white/8 bg-[#111111] p-4" key={option.method}>
                      <strong className="block text-base uppercase text-white">{option.method}</strong>
                      <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{option.travel_notes}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
              No route calculated yet. Pick a destination and run the route finder to surface the cleanest path for your
              current account context.
            </div>
          )}
        </section>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Route context</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Current request</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              Keep the short read visible here even before you jump into the dedicated route page.
            </p>
          </div>

          <div className="space-y-3 text-sm text-osrs-text-soft">
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Account</strong>
              <p className="mt-2">{selectedAccountRsn ?? "workspace-wide read"}</p>
            </div>
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Destination</strong>
              <p className="mt-2">{teleportDestination}</p>
            </div>
            <div className="border border-white/8 bg-[#111111] px-4 py-4">
              <strong className="block text-white">Preference</strong>
              <p className="mt-2">{teleportPreference}</p>
            </div>
          </div>

          {teleportRoute ? (
            <div className="mt-4 space-y-3">
              <Button
                className="w-full"
                onClick={() =>
                  onAskAdvisor(
                    `What should I unlock after ${teleportRoute.recommended_route.method} if I want smoother travel?`,
                  )
                }
                variant="secondary"
              >
                Ask about follow-up travel value
              </Button>
              <Button className="w-full" onClick={onOpenDetail} variant="secondary">
                Open teleport detail page
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
