import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export type SidebarNavItem = {
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

function StatusPill({ backendStatus }: { backendStatus: "online" | "offline" | "checking" }) {
  const statusTone =
    backendStatus === "online"
      ? "bg-osrs-success/15 text-osrs-text border-osrs-success/40"
      : backendStatus === "offline"
        ? "bg-osrs-danger/15 text-osrs-text border-osrs-danger/40"
        : "bg-osrs-gold/15 text-osrs-text border-osrs-border-light/40";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${statusTone}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
      Backend {backendStatus}
    </div>
  );
}

function NavGroup({ items }: { items: SidebarNavItem[] }) {
  return (
    <div className="cerebro-stagger space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          className={`cerebro-hover flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left ${
            item.active
              ? "border-osrs-border-light/80 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(48,40,30,0.18))] shadow-glowGold"
              : "border-osrs-border/50 bg-[linear-gradient(180deg,rgba(18,18,18,0.94),rgba(22,18,15,0.98))]"
          } ${item.disabled ? "cursor-not-allowed opacity-55" : ""}`}
          disabled={item.disabled}
          onClick={item.onClick}
          type="button"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-osrs-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.42))] text-[0.6rem] uppercase tracking-[0.22em] text-osrs-gold shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_6px_14px_rgba(0,0,0,0.22)]">
            {item.label.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-display text-[0.92rem] font-semibold uppercase tracking-[0.05em] text-osrs-text">
              {item.label}
            </span>
            <span className="mt-0.5 block text-[0.74rem] leading-5 text-osrs-text-soft">{item.description}</span>
          </span>
          {item.badge ? (
            <span className="rounded-full border border-osrs-border-light/50 bg-osrs-gold/10 px-2 py-0.5 text-[0.58rem] font-sans uppercase tracking-[0.16em] text-osrs-gold-soft">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
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
    <div className="flex h-full flex-col gap-5">
      <div className="rounded-[20px] border border-osrs-border/55 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(19,16,13,0.98))] p-4 shadow-osrs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.02))]">
            <svg className="h-5 w-5 text-osrs-gold" viewBox="0 0 100 100" fill="none">
              <path d="M50 7 92 40 50 93 8 40Z" stroke="currentColor" strokeWidth="6" />
            </svg>
          </div>
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.26em] text-osrs-gold">Cerebro</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-osrs-text-soft">OSRS intelligence</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-osrs-border/60 pt-4">
          <StatusPill backendStatus={backendStatus} />
          <div className="text-right">
            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-osrs-text-soft">Active RSN</p>
            <p className="mt-1 font-display text-base uppercase text-osrs-text">{selectedAccount?.rsn ?? "none"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-osrs-border/55 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(22,18,15,0.98))] p-4 shadow-osrs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.22em] text-osrs-gold">Signed in</p>
            <strong className="mt-2 block font-display text-lg uppercase text-osrs-text">{currentUser.display_name}</strong>
            <p className="mt-1 text-sm text-osrs-text-soft">{currentUser.email}</p>
          </div>
          <div className="rounded-[14px] border border-osrs-border/60 bg-black/20 px-3 py-2 text-right">
            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-osrs-text-soft">Linked</p>
            <p className="mt-1 font-display text-lg text-osrs-text">{accounts.length}</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[0.64rem] uppercase tracking-[0.22em] text-osrs-gold" htmlFor="account-selector">
            Active RSN
          </label>
          <select
            className="w-full rounded-[12px] border border-osrs-border/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.44))] px-3 py-2.5 text-sm text-osrs-text shadow-insetPanel"
            id="account-selector"
            onChange={(event) => onSelectAccount(event.target.value ? Number(event.target.value) : null)}
            value={selectedAccountId ?? ""}
          >
            {accounts.length === 0 ? <option value="">No account selected</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.rsn}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-[16px] border border-osrs-border/60 bg-black/20 px-4 py-4 shadow-insetPanel">
          <p className="text-[0.6rem] uppercase tracking-[0.18em] text-osrs-gold">Workspace read</p>
          <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
            {selectedAccount
              ? `${selectedAccount.rsn} is currently steering the planner. Switch the active RSN here when you want the rest of the app to pivot with it.`
              : "Choose an RSN here and the planner, advisor, and recommendation pages will shift around that account."}
          </p>
        </div>
        <Button className="w-full" onClick={onSignOut} variant="ghost">
          Sign out
        </Button>
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[0.62rem] uppercase tracking-[0.28em] text-osrs-gold">Command tabs</p>
        <NavGroup items={primaryItems} />
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[0.62rem] uppercase tracking-[0.28em] text-osrs-gold">Live surfaces</p>
        <NavGroup items={secondaryItems} />
      </div>

      <div className="mt-auto">
        <div className="rounded-[18px] border border-osrs-border/60 bg-[linear-gradient(180deg,rgba(14,14,14,0.98),rgba(18,16,14,0.98))] p-4 text-sm text-osrs-text-soft shadow-osrs">
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-osrs-gold">World note</p>
          <p className="mt-2 leading-6">
            Cerebro is moving toward a cleaner telemetry-first workspace while keeping the live backend and advisor behavior already in place.
          </p>
        </div>
      </div>
    </div>
  );
}
