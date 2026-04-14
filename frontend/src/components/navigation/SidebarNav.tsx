type SidebarNavItem = {
  id: string;
  label: string;
  description: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  onClick?: () => void;
};

type SidebarNavProps = {
  backendStatus: "online" | "offline" | "checking";
  currentUser: {
    display_name: string;
    email: string;
  };
  selectedAccountId: number | null;
  accounts: Array<{ id: number; rsn: string }>;
  onSelectAccount: (accountId: number | null) => void;
  onSignOut: () => void;
  primaryItems: SidebarNavItem[];
  secondaryItems: SidebarNavItem[];
};

export type { SidebarNavItem };

const iconPaths: Record<string, string> = {
  dashboard: "M4 5h7v6H4zm9 0h7v6h-7zM4 13h7v6H4zm9 0h7v6h-7z",
  advisor: "M4 6.5h16v9H8l-4 4z M8 11h8 M8 8.5h5",
  "gear optimizer": "M8 5.5h8l2 3v8l-2 2H8l-2-2v-8z M10 10h4 M10 13h4",
  "quest helper": "M7 3.5h8.5L19 7v13.5H7z M15.5 3.5V7H19 M10 11h6 M10 14h6 M10 17h4",
  "money makers": "M7 8h10M6 12h12M8 16h8 M12 5v14",
  "goal planner": "M12 4 14.5 9.5 20 12l-5.5 2.5L12 20l-2.5-5.5L4 12l5.5-2.5z M12 8v4",
  "saved builds": "M6 6h12v12H6z M9 6v12 M15 6v12 M6 12h12",
  inventory: "M6 7h12v10H6z M9 7V5h6v2 M9 12h6 M9 15h6",
  skills: "M6 18h3V9H6zm5 0h3V5h-3zm5 0h3v-7h-3z",
  recommendations: "M5 12h14 M12 5l7 7-7 7 M12 5 5 12l7 7",
  teleports: "M12 3c-4.4 0-8 3.28-8 7.33C4 15.78 12 21 12 21s8-5.22 8-10.67C20 6.28 16.4 3 12 3zm0 10a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  profile: "M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.33 0-6 1.67-6 4v2h12v-2c0-2.33-2.67-4-6-4z",
};

function statusDotClass(status: "online" | "offline" | "checking") {
  if (status === "online") {
    return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]";
  }
  if (status === "offline") {
    return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.55)]";
  }
  return "bg-osrs-gold shadow-[0_0_10px_rgba(212,175,55,0.55)]";
}

function NavButton({ item }: { item: SidebarNavItem }) {
  const iconPath = iconPaths[item.id.toLowerCase()] ?? iconPaths[item.label.toLowerCase()] ?? iconPaths.dashboard;

  return (
    <button
      className={`group relative flex h-11 w-11 items-center justify-center rounded-[10px] border transition-all duration-200 ${
        item.active
          ? "border-white/12 bg-white/[0.05] text-osrs-gold shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
          : "border-transparent bg-transparent text-osrs-text-soft hover:border-white/8 hover:bg-white/[0.03] hover:text-white"
      } ${item.disabled ? "cursor-not-allowed opacity-40" : ""}`}
      disabled={item.disabled}
      onClick={item.onClick}
      title={item.label}
      type="button"
      >
        <svg className="h-5.5 w-5.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d={iconPath} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {item.active ? <span className="absolute -left-[9px] top-1/2 h-8 w-px -translate-y-1/2 bg-osrs-gold" /> : null}
        <span className="pointer-events-none absolute left-[calc(100%+0.9rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-[8px] border border-white/8 bg-[#121212] px-3 py-2 text-[0.62rem] font-mono uppercase tracking-[0.18em] text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] group-hover:block group-focus-visible:block xl:block xl:opacity-0 xl:transition-opacity xl:duration-150 xl:group-hover:opacity-100 xl:group-focus-visible:opacity-100">
          {item.label}
        </span>
        {item.badge ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-black px-1.5 py-0.5 text-[0.44rem] uppercase tracking-[0.16em] text-osrs-gold">
            {item.badge}
          </span>
        ) : null}
    </button>
  );
}

export function SidebarNav({
  backendStatus,
  currentUser,
  selectedAccountId,
  accounts,
  onSelectAccount,
  onSignOut,
  primaryItems,
  secondaryItems,
}: SidebarNavProps) {
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/8 bg-[#101010] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <svg className="h-6 w-6 text-white" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M50 5 L95 40 L50 95 L5 40 Z" stroke="currentColor" strokeWidth="4" />
            <path d="M50 25 L75 45 L50 75 L25 45 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="rounded-full border border-white/8 bg-[#101010] px-2.5 py-1">
          <p className="font-mono text-[0.44rem] uppercase tracking-[0.26em] text-osrs-text-soft">Cerebro</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          {primaryItems.map((item) => (
            <NavButton item={item} key={item.id} />
          ))}
        </div>
        <div className="h-px w-9 bg-white/8" />
        <div className="flex flex-col items-center gap-3">
          {secondaryItems.map((item) => (
            <NavButton item={item} key={item.id} />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-2.5">
        <div className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/8 bg-[#101010] px-2 py-2">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(backendStatus)}`} title={`Backend ${backendStatus}`} />
          <span className="font-mono text-[0.44rem] uppercase tracking-[0.16em] text-osrs-text-soft">
            {backendStatus}
          </span>
        </div>
        <div className="w-full rounded-[10px] border border-white/8 bg-[#101010] px-2 py-2">
          <label className="sr-only" htmlFor="sidebar-account-selector">
            Active account
          </label>
          <select
            className="w-full bg-transparent text-center font-mono text-[0.52rem] uppercase tracking-[0.14em] text-osrs-text-soft outline-none"
            id="sidebar-account-selector"
            onChange={(event) => onSelectAccount(event.target.value ? Number(event.target.value) : null)}
            title={selectedAccount?.rsn ?? "No account selected"}
            value={selectedAccountId ?? ""}
          >
            {accounts.length === 0 ? <option value="">No RSN</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.rsn}
              </option>
            ))}
          </select>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/8 bg-[#101010] font-mono text-[0.5rem] uppercase tracking-[0.14em] text-osrs-text-soft"
          title={`${currentUser.display_name} / ${currentUser.email}`}
        >
          {currentUser.display_name.slice(0, 2)}
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/8 bg-[#101010] font-mono text-[0.5rem] uppercase tracking-[0.14em] text-osrs-text-soft transition-colors hover:border-white/12 hover:text-white"
          onClick={onSignOut}
          title="Sign out"
          type="button"
        >
          Out
        </button>
      </div>
    </div>
  );
}
