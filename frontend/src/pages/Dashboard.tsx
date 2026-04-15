import type {
  Account,
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
  workspaceChecklist: Array<{ title: string; done: boolean; detail: string }>;
  workspaceProgress: number;
};

function formatBankValue(selectedProgress: AccountProgress | null) {
  if ((selectedProgress?.owned_gear.length ?? 0) > 0) {
    return `${selectedProgress?.owned_gear.length} tracked items`;
  }
  return "Awaiting bank sync";
}

function formatQuestPoints(selectedProgress: AccountProgress | null) {
  if ((selectedProgress?.completed_quests.length ?? 0) > 0) {
    return `~${(selectedProgress?.completed_quests.length ?? 0) * 2}`;
  }
  return "Untracked";
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
    selectedAccount,
    workspaceChecklist,
    workspaceProgress,
  } = props;
  const shouldShowSetupLane = workspaceProgress < workspaceChecklist.length;

  return (
    <div className="space-y-8">
      <HeroPanel
        bankValue={formatBankValue(selectedProgress)}
        combatLevel={selectedSnapshot?.summary.combat_level ?? null}
        overallLevel={selectedSnapshot?.summary.overall_level ?? null}
        questPoints={formatQuestPoints(selectedProgress)}
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
