import { Button } from "../components/ui/Button";
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
    return <div className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">No route loaded.</div>;
  }

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Teleport // Detail view
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              {teleportRoute.recommended_route.method}
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">{teleportRoute.destination}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onBackToTeleports} variant="secondary">All routes</Button>
            <Button onClick={onReloadTeleport}>Refresh route</Button>
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
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Destination</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{teleportRoute.destination}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Preference</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{teleportRoute.preference}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Recommended route</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Primary travel plan</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{teleportRoute.recommended_route.travel_notes}</p>
          </div>
          <div className="border border-white/8 bg-[#111111] p-5">
            <div className="flex flex-wrap gap-2">
              <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-gold-soft">{teleportRoute.recommended_route.route_type}</span>
              <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft">{teleportRoute.recommended_route.convenience}</span>
            </div>
            {teleportRoute.recommended_route.requirements.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-7 text-osrs-text-soft">
                {teleportRoute.recommended_route.requirements.map((requirement) => (
                  <li key={requirement}>- {requirement}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Fallbacks</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Alternative routes</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">Other ways into the destination when the primary method is missing or less ideal.</p>
          </div>
          {teleportRoute.alternatives.length > 0 ? (
            teleportRoute.alternatives.map((option) => (
              <div className="border border-white/8 bg-[#111111] px-4 py-4" key={option.method}>
                <strong className="block text-white">{option.method}</strong>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{option.travel_notes}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-osrs-text-soft">No fallback routes were needed for this destination.</p>
          )}
        </section>
      </div>
    </div>
  );
}
