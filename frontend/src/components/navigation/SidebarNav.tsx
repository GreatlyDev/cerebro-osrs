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
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  advisor: "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z",
  "gear optimizer": "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  "quest helper": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
  "money makers": "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
  "goal planner": "M19 5H5v14h14V5zm-2 2v10H7V7h10z",
  "saved builds": "M5 5h14v14H5z M8 8h8v8H8z",
  inventory: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
  skills: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  recommendations: "M4 17h4V7H4v10zm6 0h4V3h-4v14zm6 0h4V11h-4v6z",
  teleports: "M12 3 1 9l11 6 9-4.91V17h2V9L12 3z",
  profile: "M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z",
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
  const iconPath = iconPaths[item.label.toLowerCase()] ?? iconPaths.dashboard;

  return (
    <button
      className={`group relative flex h-11 w-11 items-center justify-center rounded-[8px] border transition-all duration-200 ${
        item.active
          ? "border-white/12 bg-white/[0.04] text-osrs-gold"
          : "border-transparent bg-transparent text-osrs-text-soft hover:border-white/8 hover:bg-white/[0.03] hover:text-white"
      } ${item.disabled ? "cursor-not-allowed opacity-40" : ""}`}
      disabled={item.disabled}
      onClick={item.onClick}
      title={item.label}
      type="button"
    >
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d={iconPath} />
      </svg>
      {item.active ? <span className="absolute -left-[9px] top-1/2 h-8 w-px -translate-y-1/2 bg-osrs-gold" /> : null}
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
  const allItems = [...primaryItems, ...secondaryItems];

  return (
    <div className="flex h-full flex-col items-center justify-between py-4">
      <div className="flex flex-col items-center gap-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/8 bg-[#101010]">
          <svg className="h-6 w-6 text-white" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M50 5 L95 40 L50 95 L5 40 Z" stroke="currentColor" strokeWidth="4" />
            <path d="M50 25 L75 45 L50 75 L25 45 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col items-center gap-4">
          {allItems.map((item) => (
            <NavButton item={item} key={item.id} />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(backendStatus)}`} title={`Backend ${backendStatus}`} />
        <div className="w-full rounded-[8px] border border-white/8 bg-[#101010] px-2 py-2">
          <label className="sr-only" htmlFor="sidebar-account-selector">
            Active account
          </label>
          <select
            className="w-full bg-transparent text-center font-mono text-[0.55rem] uppercase tracking-[0.14em] text-osrs-text-soft outline-none"
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
          className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/8 bg-[#101010] font-mono text-[0.55rem] uppercase tracking-[0.14em] text-osrs-text-soft"
          title={`${currentUser.display_name} / ${currentUser.email}`}
        >
          {currentUser.display_name.slice(0, 2)}
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/8 bg-[#101010] font-mono text-[0.52rem] uppercase tracking-[0.14em] text-osrs-text-soft transition-colors hover:border-white/12 hover:text-white"
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
