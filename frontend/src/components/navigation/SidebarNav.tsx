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
          className={`cerebro-hover flex w-full items-start gap-3 rounded-[16px] border px-3.5 py-3 text-left ${
            item.active
              ? "border-osrs-border-light/80 bg-[linear-gradient(135deg,rgba(200,164,90,0.22),rgba(58,47,38,0.12))] shadow-glowGold"
              : "border-osrs-border/60 bg-[linear-gradient(180deg,rgba(55,43,33,0.5),rgba(25,20,16,0.95))]"
          } ${item.disabled ? "cursor-not-allowed opacity-55" : ""}`}
          disabled={item.disabled}
          onClick={item.onClick}
          type="button"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-osrs-border/80 bg-osrs-panel-2 text-[0.68rem] uppercase tracking-[0.2em] text-osrs-gold">
            {item.label.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-display text-sm font-semibold text-osrs-text">
              {item.label}
              {item.badge ? (
                <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-2 py-0.5 text-[0.6rem] font-sans uppercase tracking-[0.16em] text-osrs-gold-soft">
                  {item.badge}
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-xs leading-5 text-osrs-text-soft">{item.description}</span>
          </span>
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
      <Panel tone="hero" className="overflow-hidden">
        <div className="space-y-3">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-osrs-gold">Cerebro OSRS</p>
          <div>
            <h1 className="max-w-[13rem] font-display text-[2rem] font-semibold leading-tight text-osrs-text">
              Premium control center for RuneScape progression.
            </h1>
            <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
              A modern workspace for OSRS planning, recommendations, and advisor-style guidance.
            </p>
          </div>
          <StatusPill backendStatus={backendStatus} />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-3 py-3 shadow-insetPanel">
              <p className="text-[0.6rem] uppercase tracking-[0.18em] text-osrs-gold">Linked RSNs</p>
              <p className="mt-1 font-display text-lg text-osrs-text">{accounts.length}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-3 py-3 shadow-insetPanel">
              <p className="text-[0.6rem] uppercase tracking-[0.18em] text-osrs-gold">Active focus</p>
              <p className="mt-1 font-display text-lg text-osrs-text">{selectedAccount?.rsn ?? "none"}</p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">Signed in</p>
          <strong className="mt-2 block font-display text-lg text-osrs-text">{currentUser.display_name}</strong>
          <p className="mt-1 text-sm text-osrs-text-soft">{currentUser.email}</p>
        </div>
        <div className="space-y-2">
          <label className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold" htmlFor="account-selector">
            Active RSN
          </label>
          <select
            className="w-full rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-3 py-2.5 text-sm text-osrs-text shadow-insetPanel"
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
        <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Workspace read</p>
          <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
            {selectedAccount
              ? `${selectedAccount.rsn} is currently steering the planner. Switch the active RSN here when you want the rest of the app to pivot with it.`
              : "Choose an RSN here and the planner, advisor, and recommendation pages will shift around that account."}
          </p>
        </div>
        <Button className="w-full" onClick={onSignOut} variant="ghost">
          Sign out
        </Button>
      </Panel>

      <div className="space-y-3">
        <p className="px-1 text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">Command tabs</p>
        <NavGroup items={primaryItems} />
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">Live surfaces</p>
        <NavGroup items={secondaryItems} />
      </div>

      <div className="mt-auto">
        <Panel className="space-y-2 text-sm text-osrs-text-soft">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">World note</p>
          <p>
            The dashboard is now being rebuilt as a premium OSRS command center while keeping the live backend integrations already in place.
          </p>
        </Panel>
      </div>
    </div>
  );
}
