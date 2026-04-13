import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
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
  onAskAdvisor: (prompt: string) => void;
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/8 bg-[#111111] px-4 py-4">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">{label}</p>
      <strong className="mt-3 block font-display text-2xl text-white">{value}</strong>
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
    <div className="border border-white/8 bg-[#111111] p-4">
      <strong className="block text-white">{label}</strong>
      <textarea
        className="mt-3 min-h-32 w-full border border-white/8 bg-[#0c0c0c] px-4 py-3 text-sm leading-6 text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

export function AccountDetailView(props: AccountDetailProps) {
  const {
    accountGoals,
    busyAction,
    nextActions,
    onAskAdvisor,
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
    return <div className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">No account loaded yet.</div>;
  }

  const accountActionMatches =
    nextActions?.actions.filter(
      (action) => (action.target.account_rsn as string | undefined | null) === selectedAccount.rsn,
    ) ?? [];

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Account // Deep workspace
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              {selectedAccount.rsn}
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              A deeper account room for one linked RSN, with sync history, manual progress state, assistant-ready telemetry,
              and account-specific goals when you want them.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onAskAdvisor(`What stands out most about ${selectedAccount.rsn} right now?`)}
              variant="secondary"
            >
              Ask Cerebro
            </Button>
            <Button onClick={() => onSetPrimaryAccount(selectedAccount)} variant="secondary">
              {busyAction === `primary-${selectedAccount.id}` ? "Saving..." : "Set primary"}
            </Button>
            <Button onClick={() => onSyncAccount(selectedAccount)}>
              {busyAction === `sync-${selectedAccount.id}` ? "Syncing..." : "Sync now"}
            </Button>
            <Button onClick={onBackToDashboard} variant="secondary">Dashboard</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Account state</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">
            {profile?.primary_account_rsn === selectedAccount.rsn ? "Primary account" : "Linked account"}
          </p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Goals attached</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{accountGoals.length}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Latest sync</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedSnapshot ? formatStamp(selectedSnapshot.created_at) : "Not synced"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <div className="space-y-6">
          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Power read</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Current account state</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">A quick snapshot of where this account stands right now.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Overall" value={selectedSnapshot?.summary.overall_level ?? "n/a"} />
              <MetricCard label="Combat" value={selectedSnapshot?.summary.combat_level ?? "n/a"} />
              <MetricCard label="Tracked quests" value={selectedProgress?.completed_quests.length ?? 0} />
              <MetricCard label="Unlock chains" value={selectedProgress?.active_unlocks.length ?? 0} />
            </div>
            {selectedSnapshot?.summary.top_skills?.length ? (
              <div className="mt-4 border border-white/8 bg-[#111111] px-4 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Top skills on this snapshot</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSnapshot.summary.top_skills.slice(0, 5).map((skill) => (
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={skill.skill}>
                      {skill.skill} {skill.level}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4">
              <Button
                className="w-full"
                onClick={() => onAskAdvisor(`What should ${selectedAccount.rsn} fix first on this account?`)}
                variant="secondary"
              >
                Ask what this account should fix first
              </Button>
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Since last sync</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Recent movement</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">A lightweight trend read without leaving the account workspace.</p>
            </div>
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
              <div className="mt-4 grid gap-3">
                {selectedSnapshotHistory.slice(0, 4).map((snapshot) => (
                  <div className="border border-white/8 bg-[#111111] px-4 py-4" key={snapshot.id}>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-white">Overall {snapshot.summary.overall_level}</strong>
                      <span className="text-xs uppercase tracking-[0.16em] text-osrs-text-soft">{formatStamp(snapshot.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-osrs-text-soft">Combat {snapshot.summary.combat_level ?? "unknown"} | {snapshot.sync_status}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Planning context</p>
                <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Manual account context</h2>
                <p className="mt-2 text-sm leading-7 text-osrs-text-soft">This is the human layer on top of hiscores: quest state, travel unlocks, owned gear, and active pushes.</p>
              </div>
              <Button onClick={onSaveAccountProgress}>{busyAction === "account-progress" ? "Saving..." : "Save account workspace"}</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextareaCard label="Completed quests" value={progressDraft.completed_quests} onChange={(value) => setProgressDraft((current) => ({ ...current, completed_quests: value }))} placeholder={"bone voyage\nwaterfall quest"} />
              <TextareaCard label="Unlocked transports" value={progressDraft.unlocked_transports} onChange={(value) => setProgressDraft((current) => ({ ...current, unlocked_transports: value }))} placeholder={"digsite pendant\nfairy rings"} />
              <TextareaCard label="Owned gear" value={progressDraft.owned_gear} onChange={(value) => setProgressDraft((current) => ({ ...current, owned_gear: value }))} placeholder={"ahrim's robes\ntoxic trident"} />
              <TextareaCard label="Active unlock chains" value={progressDraft.active_unlocks} onChange={(value) => setProgressDraft((current) => ({ ...current, active_unlocks: value }))} placeholder={"quest cape\nbarrows gloves"} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Account goals</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Goal radar</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">Goals and ranked actions currently pointing at this RSN.</p>
            </div>
            {accountGoals.length > 0 ? (
              <div className="grid gap-3">
                {accountGoals.map((goal) => (
                  <div className="border border-white/8 bg-[#111111] px-4 py-4" key={goal.id}>
                    <strong className="block text-white">{goal.title}</strong>
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
            <div className="mt-4">
              <Button className="w-full" onClick={onGoToGoals} variant="secondary">Open goals</Button>
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Planner pressure</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Account-specific actions</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">These are the ranked actions that currently resolve directly onto this account.</p>
            </div>
            {accountActionMatches.length > 0 ? (
              <div className="grid gap-3">
                {accountActionMatches.slice(0, 3).map((action) => (
                  <div className="border border-white/8 bg-[#111111] px-4 py-4" key={`${action.action_type}-${action.title}`}>
                    <strong className="block text-white">{action.title}</strong>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-osrs-text-soft">No ranked actions are specifically targeting this account yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
