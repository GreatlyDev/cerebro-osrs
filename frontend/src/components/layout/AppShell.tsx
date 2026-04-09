import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  utilityRail?: ReactNode;
};

export function AppShell({ sidebar, children, utilityRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-[#080808] text-osrs-text xl:h-screen xl:overflow-hidden">
      <div className="pointer-events-none fixed inset-0 cerebro-texture" />
      <div className="pointer-events-none fixed inset-0 cerebro-vignette" />
      <div className="pointer-events-none fixed left-[-6rem] top-24 h-40 w-40 rounded-full bg-osrs-gold/6 cerebro-ambient-orb" />
      <div className="pointer-events-none fixed bottom-8 right-[-6rem] h-44 w-44 rounded-full bg-osrs-gold/4 cerebro-ambient-orb" />
      <div
        className={`relative grid min-h-screen grid-cols-1 xl:h-full xl:min-h-0 ${
          utilityRail ? "xl:grid-cols-[5rem_minmax(0,1fr)_19rem]" : "xl:grid-cols-[5rem_minmax(0,1fr)]"
        }`}
      >
        <aside className="border-b border-white/6 bg-black/96 p-2 xl:h-full xl:min-h-0 xl:border-b-0 xl:border-r xl:border-white/6 xl:p-2 xl:overflow-y-auto">
          {sidebar}
        </aside>
        <main className="cerebro-scrollbar min-w-0 px-4 py-4 md:px-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:px-14 xl:py-12">
          <div className="cerebro-fade-up">{children}</div>
        </main>
        {utilityRail ? (
          <aside className="cerebro-scrollbar border-t border-white/6 bg-[#0c0c0c]/98 px-4 py-4 md:px-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:border-t-0 xl:border-l xl:border-white/6 xl:px-5 xl:py-8">
            <div className="space-y-5 cerebro-fade-up">{utilityRail}</div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
