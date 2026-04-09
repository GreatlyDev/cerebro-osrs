import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  utilityRail?: ReactNode;
};

export function AppShell({ sidebar, children, utilityRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-osrs-bg text-osrs-text xl:h-screen xl:overflow-hidden">
      <div className="pointer-events-none fixed inset-0 cerebro-texture" />
      <div className="pointer-events-none fixed inset-0 cerebro-vignette" />
      <div className="pointer-events-none fixed left-[-6rem] top-20 h-56 w-56 rounded-full bg-osrs-gold/20 cerebro-ambient-orb" />
      <div className="pointer-events-none fixed bottom-16 right-[-5rem] h-64 w-64 rounded-full bg-emerald-900/20 cerebro-ambient-orb" />
      <div className="relative grid min-h-screen grid-cols-1 xl:h-full xl:min-h-0 xl:grid-cols-[17rem_minmax(0,1fr)_21rem]">
        <aside className="border-b border-osrs-border/45 bg-[linear-gradient(180deg,rgba(13,13,13,0.98),rgba(17,15,13,0.98))] p-4 xl:h-full xl:min-h-0 xl:border-b-0 xl:border-r xl:p-5 xl:overflow-y-auto xl:backdrop-blur-md">
          {sidebar}
        </aside>
        <main className="cerebro-scrollbar min-w-0 px-4 py-4 md:px-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:px-7 xl:py-7">
          <div className="cerebro-fade-up">{children}</div>
        </main>
        <aside className="cerebro-scrollbar border-t border-osrs-border/45 bg-[linear-gradient(180deg,rgba(13,13,13,0.98),rgba(17,15,13,0.98))] px-4 py-4 md:px-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-5 xl:py-7 xl:backdrop-blur-md">
          <div className="space-y-4 cerebro-fade-up">{utilityRail}</div>
        </aside>
      </div>
    </div>
  );
}
