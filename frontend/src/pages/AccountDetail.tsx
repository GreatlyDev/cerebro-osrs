import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type {
  Account,
  AccountProgress,
  AccountSnapshot,
  Goal,
  NextActionResponse,
  Profile,
} from "../types";

type AccountDetailProps = {
  accountGoals: Goal[];
  busyAction: string | null;
  nextActions: NextActionResponse | null;
  onBackToDashboard: () => void;
  onGeneratePlan: (goal: Goal) => void;
  onGoToGoals: () => void;
  onSaveAccountProgress: () => void;
  onSetPrimaryAccount: (account: Account) => void;
  onSyncAccount: (account: Account) => void;
  profile: Profile | null;
  progressDraft: {
    completed_quests: string;
    unlocked_transports: string;
    owned_gear: string;
    active_unlocks: string;
  };
  selectedAccount: Account | null;
  selectedProgress: AccountProgress | null;
  selectedSnapshot: AccountSnapshot | null;
  selectedSnapshotDelta: {
    overallLevelDelta: number;
    combatLevelDelta: number;
    improvedSkills: Array<{ skill: string; previousLevel: number; currentLevel: number | undefined }>;
    currentSyncAt: string;
    previousSyncAt: string;
    newNinetyPlusCount: number;
  } | null;
  selectedSnapshotHistory: AccountSnapshot[];
  setProgressDraft: Dispatch<
    SetStateAction<{
      completed_quests: string;
      unlocked_transports: string;
      owned_gear: string;
      active_unlocks: string;
    }>
  >;
};

function formatStamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AccountDetailView(props: AccountDetailProps) {
  const {
    accountGoals,
    busyAction,
    nextActions,
    onBackToDashboard,
    onGeneratePlan,
    onGoToGoals,
    onSaveAccountProgress,
    onSetPrimaryAccount,
    onSyncAccount,
    profile,
    progressDraft,
    selectedAccount,
    selectedProgress,
    selectedSnapshot,
    selectedSnapshotDelta,
    selectedSnapshotHistory,
    setProgressDraft,
  } = props;

  if (!selectedAccount) {
    return (
      <Panel>
        <p className="text-sm leading-7 text-osrs-text-soft">No account loaded yet.</p>
      </Panel>
    );
  }

  const accountActionMatches =
    nextActions?.actions.filter(
      (action) => (action.target.account_rsn as string | undefined | null) === selectedAccount.rsn,
    ) ?? [];

  return (
    <div className="space-y-6">
      <Panel tone="hero">
        <SectionHeader
          action={
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => onSetPrimaryAccount(selectedAccount)} variant="secondary">
                {busyAction === `primary-${selectedAccount.id}` ? "Saving..." : "Set primary"}
              </Button>
              <Button onClick={() => onSyncAccount(selectedAccount)}>
                {busyAction === `sync-${selectedAccount.id}` ? "Syncing..." : "Sync now"}
              </Button>
            </div>
          }
          eyebrow="Account Workspace"
          subtitle="A deeper planning room for one linked RSN, with sync history, manual progress state, and account-specific goals."
          title={selectedAccount.rsn}
        />
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <button className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5" onClick={onBackToDashboard} type="button">
            Back to dashboard
          </button>
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            {profile?.primary_account_rsn === selectedAccount.rsn ? "Primary account" : "Linked account"}
          </span>
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Goals {accountGoals.length}
          </span>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionHeader
              eyebrow="Power read"
              subtitle="A quick snapshot of where this account stands right now."
              title="Current account state"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Overall" value={selectedSnapshot?.summary.overall_level ?? "n/a"} />
              <MetricCard label="Combat" value={selectedSnapshot?.summary.combat_level ?? "n/a"} />
              <MetricCard label="Tracked quests" value={selectedProgress?.completed_quests.length ?? 0} />
              <MetricCard label="Unlock chains" value={selectedProgress?.active_unlocks.length ?? 0} />
            </div>
          </Panel>

          <Panel className="space-y-4">
            <SectionHeader
              eyebrow="Since last sync"
              subtitle="A lightweight trend read without leaving the account workspace."
              title="Recent movement"
            />
            {selectedSnapshotDelta ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Overall delta" value={`${selectedSnapshotDelta.overallLevelDelta >= 0 ? "+" : ""}${selectedSnapshotDelta.overallLevelDelta}`} />
                <MetricCard label="Combat delta" value={`${selectedSnapshotDelta.combatLevelDelta >= 0 ? "+" : ""}${selectedSnapshotDelta.combatLevelDelta}`} />
                <MetricCard label="Skills improved" value={selectedSnapshotDelta.improvedSkills.length} />
                <MetricCard label="New 90+ skills" value={`${selectedSnapshotDelta.newNinetyPlusCount >= 0 ? "+" : ""}${selectedSnapshotDelta.newNinetyPlusCount}`} />
              </div>
            ) : (
              <p className="text-sm leading-7 text-osrs-text-soft">Sync this account more than once to start showing momentum here.</p>
            )}
            {selectedSnapshotHistory.length > 0 ? (
              <div className="grid gap-3">
                {selectedSnapshotHistory.slice(0, 4).map((snapshot) => (
                  <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel" key={snapshot.id}>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-osrs-text">Overall {snapshot.summary.overall_level}</strong>
                      <span className="text-xs uppercase tracking-[0.16em] text-osrs-text-soft">{formatStamp(snapshot.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-osrs-text-soft">Combat {snapshot.summary.combat_level ?? "unknown"} | {snapshot.sync_status}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel className="space-y-4">
            <SectionHeader
              action={<Button onClick={onSaveAccountProgress}>{busyAction === "account-progress" ? "Saving..." : "Save account workspace"}</Button>}
              eyebrow="Planning context"
              subtitle="This is the human layer on top of hiscores: quest state, travel unlocks, owned gear, and active pushes."
              title="Manual account context"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextareaCard label="Completed quests" value={progressDraft.completed_quests} onChange={(value) => setProgressDraft((current) => ({ ...current, completed_quests: value }))} placeholder={"bone voyage\nwaterfall quest"} />
              <TextareaCard label="Unlocked transports" value={progressDraft.unlocked_transports} onChange={(value) => setProgressDraft((current) => ({ ...current, unlocked_transports: value }))} placeholder={"digsite pendant\nfairy rings"} />
              <TextareaCard label="Owned gear" value={progressDraft.owned_gear} onChange={(value) => setProgressDraft((current) => ({ ...current, owned_gear: value }))} placeholder={"ahrim's robes\ntoxic trident"} />
              <TextareaCard label="Active unlock chains" value={progressDraft.active_unlocks} onChange={(value) => setProgressDraft((current) => ({ ...current, active_unlocks: value }))} placeholder={"quest cape\nbarrows gloves"} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionHeader eyebrow="Account goals" title="Goal radar" subtitle="Goals and ranked actions currently pointing at this RSN." />
            {accountGoals.length > 0 ? (
              <div className="grid gap-3">
                {accountGoals.map((goal) => (
                  <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel" key={goal.id}>
                    <strong className="block text-osrs-text">{goal.title}</strong>
                    <p className="mt-2 text-sm text-osrs-text-soft">{goal.goal_type}</p>
                    <Button className="mt-3 w-full" onClick={() => onGeneratePlan(goal)} variant="secondary">
                      {busyAction === `plan-${goal.id}` ? "Generating..." : "Generate plan"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-osrs-text-soft">No goals are tied to this account yet.</p>
            )}
            <Button className="w-full" onClick={onGoToGoals} variant="secondary">Open goals</Button>
          </Panel>

          <Panel className="space-y-4">
            <SectionHeader eyebrow="Planner pressure" title="Account-specific actions" />
            {accountActionMatches.length > 0 ? (
              <div className="grid gap-3">
                {accountActionMatches.slice(0, 3).map((action) => (
                  <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel" key={`${action.action_type}-${action.title}`}>
                    <strong className="block text-osrs-text">{action.title}</strong>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-osrs-text-soft">No ranked actions are specifically targeting this account yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">{label}</p>
      <strong className="mt-3 block font-display text-2xl text-osrs-text">{value}</strong>
    </div>
  );
}

function TextareaCard({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel">
      <strong className="block text-osrs-text">{label}</strong>
      <textarea
        className="mt-3 min-h-32 w-full rounded-[14px] border border-osrs-border/70 bg-osrs-panel/55 px-4 py-3 text-sm leading-6 text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
