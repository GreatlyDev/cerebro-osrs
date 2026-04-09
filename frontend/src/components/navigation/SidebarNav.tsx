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

function statusDotClass(status: "online" | "offline" | "checking") {
  if (status === "online") {
    return "bg-osrs-success shadow-[0_0_12px_rgba(111,161,109,0.75)]";
  }
  if (status === "offline") {
    return "bg-osrs-danger shadow-[0_0_12px_rgba(139,46,46,0.55)]";
  }
  return "bg-osrs-gold shadow-[0_0_12px_rgba(200,164,90,0.55)]";
}

function NavButton({ item }: { item: SidebarNavItem }) {
  const icon = item.label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <button
      className={`group relative flex h-11 w-11 items-center justify-center rounded-[12px] border transition-all duration-200 ${
        item.active
          ? "border-osrs-gold/60 bg-[linear-gradient(180deg,rgba(212,175,55,0.14),rgba(255,255,255,0.02))] text-osrs-gold"
          : "border-osrs-border/35 bg-[#131313] text-osrs-text-soft hover:border-osrs-border-light/45 hover:text-osrs-text"
      } ${item.disabled ? "cursor-not-allowed opacity-45" : ""}`}
      disabled={item.disabled}
      onClick={item.onClick}
      title={item.label}
      type="button"
    >
      {item.active ? <span className="absolute left-[-10px] top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-osrs-gold" /> : null}
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]">{icon}</span>
      {item.badge ? (
        <span className="absolute -right-1 -top-1 rounded-full border border-osrs-border/40 bg-black px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.14em] text-osrs-gold">
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
    <div className="flex h-full flex-col items-center">
      <div className="flex flex-col items-center gap-6 pt-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-osrs-border/45 bg-[#0f0f0f]">
          <svg className="h-5 w-5 text-osrs-text" viewBox="0 0 100 100" fill="none">
            <path d="M50 7 92 40 50 93 8 40Z" stroke="currentColor" strokeWidth="8" />
          </svg>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(backendStatus)}`} title={`Backend ${backendStatus}`} />
          <span className="text-[0.55rem] uppercase tracking-[0.24em] text-osrs-text-soft [writing-mode:vertical-rl]">
            Cerebro
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {allItems.map((item) => (
          <NavButton item={item} key={item.id} />
        ))}
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pb-2">
        <div className="w-full rounded-[14px] border border-osrs-border/35 bg-[#111111] px-2 py-2">
          <label className="sr-only" htmlFor="sidebar-account-selector">
            Active account
          </label>
          <select
            className="w-full bg-transparent text-center font-mono text-[0.6rem] uppercase tracking-[0.12em] text-osrs-text outline-none"
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
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-osrs-border/35 bg-[#111111] text-[0.62rem] uppercase tracking-[0.16em] text-osrs-text-soft"
          title={`${currentUser.display_name} / ${currentUser.email}`}
        >
          {currentUser.display_name.slice(0, 2)}
        </div>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-osrs-border/35 bg-[#111111] text-[0.62rem] uppercase tracking-[0.16em] text-osrs-text-soft transition-colors hover:border-osrs-border-light/45 hover:text-osrs-text"
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
