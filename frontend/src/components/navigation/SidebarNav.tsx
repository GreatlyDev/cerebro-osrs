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
  advisor: "M4 5h16v10H8l-4 4z",
  "gear optimizer": "M13.5 4 20 10.5 10.5 20H4v-6.5z",
  "quest helper": "M7 3.5h8.5L19 7v13.5H7z M15.5 3.5V7H19",
  "money makers": "M12 4c-3.31 0-6 1.34-6 3v10c0 1.66 2.69 3 6 3s6-1.34 6-3V7c0-1.66-2.69-3-6-3zm0 0v16",
  "goal planner": "M12 4a8 8 0 1 0 8 8 M12 4v8l5 3",
  "saved builds": "M6 5h12v14H6z M9 9h6 M9 13h6",
  inventory: "M6 4h12v16H6z M6 9h12 M10 4v16 M14 4v16",
  skills: "M6 18h3V9H6zm5 0h3V5h-3zm5 0h3v-7h-3z",
  recommendations: "m12 4 2.1 4.8L19 10l-3.5 3 1 5-4.5-2.6L7.5 18l1-5L5 10l4.9-1.2z",
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
