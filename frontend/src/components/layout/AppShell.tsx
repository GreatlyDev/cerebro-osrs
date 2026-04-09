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
      <div className="pointer-events-none fixed left-[-8rem] top-28 h-48 w-48 rounded-full bg-osrs-gold/8 cerebro-ambient-orb" />
      <div className="pointer-events-none fixed bottom-10 right-[-6rem] h-52 w-52 rounded-full bg-emerald-900/10 cerebro-ambient-orb" />
      <div className="relative grid min-h-screen grid-cols-1 xl:h-full xl:min-h-0 xl:grid-cols-[5rem_minmax(0,1fr)_21rem]">
        <aside className="border-b border-osrs-border/35 bg-[#090909]/98 p-2 xl:h-full xl:min-h-0 xl:border-b-0 xl:border-r xl:p-2 xl:overflow-y-auto xl:backdrop-blur-md">
          {sidebar}
        </aside>
        <main className="cerebro-scrollbar min-w-0 px-4 py-4 md:px-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:px-10 xl:py-10">
          <div className="cerebro-fade-up">{children}</div>
        </main>
        <aside className="cerebro-scrollbar border-t border-osrs-border/35 bg-[#0d0d0d]/98 px-4 py-4 md:px-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-4 xl:py-6 xl:backdrop-blur-md">
          <div className="space-y-4 cerebro-fade-up">{utilityRail}</div>
        </aside>
      </div>
    </div>
  );
}
