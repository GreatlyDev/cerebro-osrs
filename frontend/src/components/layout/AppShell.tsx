import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  utilityRail?: ReactNode;
};

export function AppShell({ sidebar, children, utilityRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-osrs-bg text-osrs-text">
      <div className="pointer-events-none fixed inset-0 cerebro-texture" />
      <div className="pointer-events-none fixed inset-0 cerebro-vignette" />
      <div className="relative grid min-h-screen grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="border-b border-osrs-border/60 bg-[linear-gradient(180deg,rgba(29,23,18,0.97),rgba(18,15,12,0.98))] p-5 xl:sticky xl:top-0 xl:h-screen xl:border-b-0 xl:border-r">
          {sidebar}
        </aside>
        <main className="cerebro-scrollbar min-w-0 px-4 py-5 md:px-6 xl:h-screen xl:overflow-y-auto xl:px-8 xl:py-8">
          {children}
        </main>
        <aside className="border-t border-osrs-border/60 bg-[linear-gradient(180deg,rgba(25,20,16,0.96),rgba(17,14,12,0.98))] px-4 py-5 md:px-6 xl:h-screen xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-6 xl:py-8">
          <div className="space-y-5">{utilityRail}</div>
        </aside>
      </div>
    </div>
  );
}
