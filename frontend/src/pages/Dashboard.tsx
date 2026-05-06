import type {
  Account,
  AccountBrain,
  AccountProgress,
  AccountSnapshot,
  AuthUser,
  ChatExchange,
  Goal,
  NextAction,
  NextActionResponse,
  Profile,
} from "../types";
import { HeroPanel } from "../components/dashboard/HeroPanel";
import { TelemetryBoard } from "../components/dashboard/TelemetryBoard";
import { WorkspaceSetupPanel } from "../components/dashboard/WorkspaceSetupPanel";

type DashboardPageProps = {
  accountCount: number;
  busyAction: string | null;
  currentUser: AuthUser;
  profile: Profile | null;
  goals: Goal[];
  newAccountRsn: string;
  nextActions: NextActionResponse | null;
  onChangeNewAccountRsn: (value: string) => void;
  selectedProgress: AccountProgress | null;
  selectedSnapshot: AccountSnapshot | null;
  chatHistory: ChatExchange[];
  chatPrompt: string;
  chatReply: string;
  onAskAdvisor: (prompt: string) => void;
  onPromptChange: (value: string) => void;
  onRefreshCompanionStatus: () => Promise<void> | void;
  onRunChatPrompt: (promptOverride?: string) => void;
  onOpenNextAction: (action: NextAction) => void;
  onGoToAdvisor: () => void;
  onGoToGoals: () => void;
  onGoToGear: () => void;
  onGoToQuests: () => void;
  onGoToRecommendations: () => void;
  onGoToProfile: () => void;
  onGoToSkills: () => void;
  onQuickstartAccount: () => void;
  onQuickstartGoal: () => void;
  selectedAccount: Account | null;
  selectedAccountBrain: AccountBrain | null;
  workspaceChecklist: Array<{ title: string; done: boolean; detail: string }>;
  workspaceProgress: number;
};

function formatBankValue(selectedProgress: AccountProgress | null) {
  if ((selectedProgress?.owned_gear.length ?? 0) > 0) {
    return `${selectedProgress?.owned_gear.length} tracked items`;
  }
  return "Awaiting bank sync";
}

function hasCompanionSync(selectedProgress: AccountProgress | null) {
  const source = selectedProgress?.companion_state?.source;
  return typeof source === "string" && source === "runelite_companion";
}

function formatQuestMetric(selectedProgress: AccountProgress | null) {
  const trackedQuestCount = selectedProgress?.completed_quests.length ?? 0;
  if (trackedQuestCount > 0) {
    return {
      label: "Quest tracking",
      value: `${trackedQuestCount} quests`,
    };
  }

  if (hasCompanionSync(selectedProgress)) {
    return {
      label: "Quest tracking",
      value: "Sync active",
    };
  }

  return {
    label: "Quest tracking",
    value: "Untracked",
  };
}

export function DashboardPage(props: DashboardPageProps) {
  const {
    accountCount,
    busyAction,
    currentUser,
    goals,
    newAccountRsn,
    onAskAdvisor,
    onChangeNewAccountRsn,
    onGoToGoals,
    onGoToProfile,
    onRefreshCompanionStatus,
    onQuickstartAccount,
    onQuickstartGoal,
    profile,
    nextActions,
    selectedProgress,
    selectedSnapshot,
    selectedAccountBrain,
    selectedAccount,
    workspaceChecklist,
    workspaceProgress,
  } = props;
  const shouldShowSetupLane = workspaceProgress < workspaceChecklist.length;
  const questMetric = formatQuestMetric(selectedProgress);

  return (
    <div className="space-y-8">
      <HeroPanel
        bankValue={formatBankValue(selectedProgress)}
        combatLevel={selectedSnapshot?.summary.combat_level ?? null}
        overallLevel={selectedSnapshot?.summary.overall_level ?? null}
        questMetricLabel={questMetric.label}
        questMetricValue={questMetric.value}
        selectedAccountRsn={selectedAccount?.rsn ?? profile?.primary_account_rsn ?? null}
      />
      <TelemetryBoard
        busyAction={busyAction}
        newAccountRsn={newAccountRsn}
        nextActions={nextActions}
        onAskAdvisor={onAskAdvisor}
        onChangeNewAccountRsn={onChangeNewAccountRsn}
        onRefreshCompanionStatus={onRefreshCompanionStatus}
        onQuickstartAccount={onQuickstartAccount}
        progress={selectedProgress}
        accountBrain={selectedAccountBrain}
        selectedAccount={selectedAccount}
        snapshot={selectedSnapshot}
      />
      {shouldShowSetupLane ? (
        <WorkspaceSetupPanel
          accountCount={accountCount}
          busyAction={busyAction}
          currentUserName={currentUser.display_name}
          goalCount={goals.length}
          newAccountRsn={newAccountRsn}
          onAskAdvisor={onAskAdvisor}
          onChangeNewAccountRsn={onChangeNewAccountRsn}
          onGoToGoals={onGoToGoals}
          onGoToProfile={onGoToProfile}
          onQuickstartAccount={onQuickstartAccount}
          onQuickstartGoal={onQuickstartGoal}
          primaryAccountRsn={selectedAccount?.rsn ?? profile?.primary_account_rsn ?? null}
          workspaceChecklist={workspaceChecklist}
          workspaceProgress={workspaceProgress}
        />
      ) : null}
    </div>
  );
}
