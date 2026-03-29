import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

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
    <Panel className="space-y-5" tone="soft">
      <SectionHeader
        eyebrow="Guided Start"
        subtitle="A real setup lane for getting from sign-in to a useful planning workspace."
        title="Finish the basics once and the app gets much smarter"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_20rem]">
        <div className="space-y-4">
          <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(60,46,30,0.62),rgba(24,19,15,0.96))] px-5 py-5 shadow-insetPanel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current next step</p>
                <h3 className="mt-2 font-display text-2xl text-osrs-text">{nextStep.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-osrs-text-soft">{nextStep.body}</p>
              </div>
              <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-3 text-center shadow-insetPanel">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Setup</p>
                <strong className="mt-2 block font-display text-2xl text-osrs-text">
                  {workspaceProgress}/{totalSteps}
                </strong>
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full border border-osrs-border/60 bg-osrs-stone/40">
              <div className="h-full rounded-full bg-osrs-progress" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={nextStep.action}>
                {nextStep.actionLabel}
              </Button>
              {hasGoal ? <Button onClick={onGoToGoals} variant="secondary">Open goal planner</Button> : null}
            </div>

            {!hasAccount ? (
              <div className="mt-5 rounded-[18px] border border-osrs-border/65 bg-osrs-panel-2/45 px-4 py-4 shadow-insetPanel">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Fastest way to get moving</p>
                <p className="mt-3 text-sm leading-7 text-osrs-text-soft">
                  Add an RSN here and Cerebro will link it, sync it, and make it the primary account in one pass.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
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
        </div>

        <div className="space-y-3">
          <div className="rounded-[18px] border border-osrs-border/70 bg-osrs-panel-2/50 px-4 py-4 shadow-insetPanel">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Workspace summary</p>
            <div className="mt-3 grid gap-2 text-sm text-osrs-text-soft">
              <div className="flex items-center justify-between gap-3">
                <span>Signed in as</span>
                <strong className="font-display text-base text-osrs-text">{currentUserName}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Linked accounts</span>
                <strong className="font-display text-base text-osrs-text">{accountCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Primary RSN</span>
                <strong className="font-display text-base text-osrs-text">{primaryAccountRsn ?? "not set"}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Goals</span>
                <strong className="font-display text-base text-osrs-text">{goalCount}</strong>
              </div>
            </div>
          </div>

          <div className="cerebro-stagger space-y-3">
            {workspaceChecklist.map((item, index) => (
              <div
                className={`rounded-[18px] border px-4 py-4 shadow-insetPanel ${
                  item.done
                    ? "border-osrs-success/35 bg-osrs-success/10"
                    : index === workspaceProgress
                      ? "border-osrs-border-light/70 bg-[linear-gradient(135deg,rgba(200,164,90,0.16),rgba(58,47,38,0.12))]"
                      : "border-osrs-border/70 bg-osrs-panel-2/45"
                }`}
                key={item.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-osrs-text">{item.title}</strong>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{item.detail}</p>
                  </div>
                  <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/65 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-osrs-text-soft">
                    {item.done ? "done" : index === workspaceProgress ? "next" : "pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
