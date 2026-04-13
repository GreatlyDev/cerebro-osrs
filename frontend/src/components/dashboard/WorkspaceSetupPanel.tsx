import { Button } from "../ui/Button";

type ChecklistItem = {
  title: string;
  done: boolean;
  detail: string;
};

type WorkspaceSetupPanelProps = {
  accountCount: number;
  busyAction: string | null;
  currentUserName: string;
  goalCount: number;
  newAccountRsn: string;
  onChangeNewAccountRsn: (value: string) => void;
  onGoToGoals: () => void;
  onGoToProfile: () => void;
  onQuickstartAccount: () => void;
  onQuickstartGoal: () => void;
  primaryAccountRsn: string | null;
  workspaceChecklist: ChecklistItem[];
  workspaceProgress: number;
};

export function WorkspaceSetupPanel({
  accountCount,
  busyAction,
  currentUserName,
  goalCount,
  newAccountRsn,
  onChangeNewAccountRsn,
  onGoToGoals,
  onGoToProfile,
  onQuickstartAccount,
  onQuickstartGoal,
  primaryAccountRsn,
  workspaceChecklist,
  workspaceProgress,
}: WorkspaceSetupPanelProps) {
  const totalSteps = workspaceChecklist.length;
  const completion = totalSteps > 0 ? (workspaceProgress / totalSteps) * 100 : 0;
  const hasBaseline = workspaceChecklist[0]?.done ?? false;
  const hasAccount = workspaceChecklist[1]?.done ?? false;
  const hasPrimary = workspaceChecklist[2]?.done ?? false;
  const hasGoal = workspaceChecklist[3]?.done ?? false;

  const nextStep = !hasBaseline
    ? {
        title: "Set your planning baseline",
        body: "Lock in your play style and focus so every recommendation starts from the right point of view.",
        actionLabel: "Open profile",
        action: onGoToProfile,
      }
    : !hasAccount
      ? {
          title: "Link your first RuneScape account",
          body: "Add an RSN and let Cerebro sync it so the workspace can stop relying on broad defaults.",
          actionLabel: "Run quick setup",
          action: onQuickstartAccount,
        }
      : !hasPrimary
        ? {
            title: "Choose the account this workspace revolves around",
            body: "A primary RSN makes the whole planner feel more coherent once you start moving through the app.",
            actionLabel: "Open profile",
            action: onGoToProfile,
          }
        : !hasGoal
          ? {
              title: "Anchor the planner with a real goal",
              body: "Turn the workspace into a sharper progression engine by giving it one concrete target to optimize for.",
              actionLabel: "Create first goal",
              action: onQuickstartGoal,
            }
          : {
              title: "Your workspace is ready for deeper planning",
              body: "The setup basics are in place. Move into goals, recommendations, and advisor prompts to get more value from the planner.",
              actionLabel: "Open goals",
              action: onGoToGoals,
            };

  return (
    <section className="space-y-6 border border-white/8 bg-[#101010] px-6 py-6">
      <div className="flex flex-col gap-6 border-b border-white/8 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.38em] text-osrs-text-soft/75">
            Guided start // Workspace readiness
          </p>
          <h2 className="mt-2 max-w-4xl font-display text-[2.3rem] font-black uppercase leading-[0.96] tracking-[0.08em] text-white md:text-[2.8rem]">
            Finish the basics once and Cerebro gets a lot sharper
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-osrs-text-soft">
            This lane keeps the first-run setup visible until the workspace is ready for real account-aware planning.
          </p>
        </div>
        <div className="border border-white/8 bg-[#0c0c0c] px-4 py-4 text-right">
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Setup progress</p>
          <strong className="mt-2 block font-display text-[2rem] uppercase text-white">
            {workspaceProgress}/{totalSteps}
          </strong>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <div className="space-y-4">
          <div className="border border-white/8 bg-[radial-gradient(circle_at_76%_20%,rgba(212,175,55,0.08),transparent_35%),linear-gradient(180deg,#0b0b0b_0%,#0f0f0f_100%)] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Current next step</p>
                <h3 className="mt-3 font-display text-[1.7rem] font-bold uppercase tracking-[0.05em] text-white">
                  {nextStep.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-osrs-text-soft">{nextStep.body}</p>
              </div>
              <div className="border border-white/8 bg-black/25 px-4 py-3 text-center">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-osrs-text-soft">Ready</p>
                <strong className="mt-2 block font-display text-[1.6rem] uppercase text-white">
                  {Math.round(completion)}%
                </strong>
              </div>
            </div>
            <div className="mt-5 h-[2px] w-full bg-white/8">
              <div className="h-full bg-osrs-gold" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={nextStep.action}>{nextStep.actionLabel}</Button>
              {hasGoal ? (
                <Button onClick={onGoToGoals} variant="secondary">
                  Open goal planner
                </Button>
              ) : null}
            </div>
          </div>

          {!hasAccount ? (
            <div className="border border-white/8 bg-[#0c0c0c] px-5 py-5">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Fastest way to get moving</p>
              <p className="mt-3 text-sm leading-7 text-osrs-text-soft">
                Add an RSN here and Cerebro will link it, sync it, and make it the primary account in one pass.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="w-full border border-white/8 bg-[#080808] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
                  onChange={(event) => onChangeNewAccountRsn(event.target.value)}
                  placeholder="Enter your RSN"
                  value={newAccountRsn}
                />
                <Button onClick={onQuickstartAccount}>
                  {busyAction === "quickstart-account" ? "Setting up..." : "Run quick setup"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="border border-white/8 bg-[#0c0c0c] px-4 py-4">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Workspace summary</p>
            <div className="mt-4 grid gap-3 text-sm text-osrs-text-soft">
              <div className="flex items-center justify-between gap-3">
                <span>Signed in as</span>
                <strong className="font-display text-base uppercase text-white">{currentUserName}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Linked accounts</span>
                <strong className="font-display text-base text-white">{accountCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Primary RSN</span>
                <strong className="font-display text-base uppercase text-white">{primaryAccountRsn ?? "not set"}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Goals</span>
                <strong className="font-display text-base text-white">{goalCount}</strong>
              </div>
            </div>
          </div>

          <div className="cerebro-stagger space-y-3">
            {workspaceChecklist.map((item, index) => (
              <div
                className={`border px-4 py-4 ${
                  item.done
                    ? "border-emerald-700/35 bg-emerald-950/12"
                    : index === workspaceProgress
                      ? "border-osrs-gold/35 bg-[rgba(200,164,90,0.08)]"
                      : "border-white/8 bg-[#0c0c0c]"
                }`}
                key={item.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block font-display text-[1rem] uppercase tracking-[0.04em] text-white">
                      {item.title}
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{item.detail}</p>
                  </div>
                  <span className="border border-white/8 bg-black/20 px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.16em] text-osrs-text-soft">
                    {item.done ? "done" : index === workspaceProgress ? "next" : "pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
