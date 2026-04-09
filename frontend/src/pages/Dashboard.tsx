import type {
  AccountProgress,
  AccountSnapshot,
  AuthUser,
  ChatExchange,
  Goal,
  NextAction,
  NextActionResponse,
  Profile,
} from "../types";
import { AdvisorConsole } from "../components/dashboard/AdvisorConsole";
import { FeatureGrid } from "../components/dashboard/FeatureGrid";
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
  selectedAccount: { rsn: string } | null;
  selectedProgress: AccountProgress | null;
  selectedSnapshot: AccountSnapshot | null;
  chatHistory: ChatExchange[];
  chatPrompt: string;
  chatReply: string;
  onPromptChange: (value: string) => void;
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
    currentUser,
    profile,
    goals,
    accountCount,
    busyAction,
    newAccountRsn,
    nextActions,
    onChangeNewAccountRsn,
    selectedAccount,
    selectedProgress,
    selectedSnapshot,
    chatHistory,
    chatPrompt,
    chatReply,
    onPromptChange,
    onRunChatPrompt,
    onOpenNextAction,
    onGoToAdvisor,
    onGoToGoals,
    onGoToGear,
    onGoToQuests,
    onGoToRecommendations,
    onGoToProfile,
    onGoToSkills,
    onQuickstartAccount,
    onQuickstartGoal,
    workspaceChecklist,
    workspaceProgress,
  } = props;

  const topAction = nextActions?.top_action ?? null;
  const featureItems = [
    {
      eyebrow: "Cerebro Advisor",
      title: selectedAccount?.rsn ? `Ask about ${selectedAccount.rsn}` : "Keep Cerebro within reach",
      summary: selectedAccount
        ? "Use the advisor for direct stat checks, route questions, gear comparisons, money-making calls, boss prep, and broader OSRS decisions around the active account."
        : "Cerebro should feel like a persistent OSRS assistant first. Goals can sharpen the workspace later, but they should not dominate the whole experience.",
      meta: selectedAccount ? `${selectedAccount.rsn} in focus` : "Persistent assistant surface",
      actionLabel: "Open Advisor",
      onAction: onGoToAdvisor,
    },
    {
      eyebrow: "Gear Optimizer",
      title: topAction?.action_type === "gear" ? topAction.title : "Loadout upgrade lane",
      summary:
        topAction?.action_type === "gear"
          ? topAction.summary
          : "Use Cerebro's gear surface to turn snapshot context into cleaner upgrade ladders for the current account.",
      meta: selectedProgress?.owned_gear.length
        ? `${selectedProgress.owned_gear.length} tracked gear item${selectedProgress.owned_gear.length > 1 ? "s" : ""}`
        : "No gear tracked yet",
      actionLabel: "Open Gear Optimizer",
      onAction: onGoToGear,
    },
    {
      eyebrow: "Goal Planner",
      title: goals[0]?.title ?? "Anchor a goal when it helps",
      summary:
        goals.length > 0
          ? `${goals.length} goal${goals.length > 1 ? "s" : ""} are available as planning anchors, but they are only one input into Cerebro's broader account advice.`
          : "Goals still matter, but they should sharpen the workspace when you want them instead of defining every recommendation by default.",
      meta: goals.length > 0 ? `${goals[0]?.status} / ${goals[0]?.target_account_rsn ?? "workspace-wide"}` : "No goals yet",
      actionLabel: goals.length > 0 ? "Open Goal Planner" : "Create First Goal",
      onAction: onGoToGoals,
    },
    {
      eyebrow: "Quest Guidance",
      title: topAction?.action_type === "quest" ? topAction.title : "Unlock-first quest guidance",
      summary:
        topAction?.action_type === "quest"
          ? topAction.summary
          : "Open the quest helper when you want to chase unlocks, requirements, and follow-up value in a more guided way.",
      meta: selectedProgress?.completed_quests.length
        ? `${selectedProgress.completed_quests.length} tracked completions`
        : "No quest progress tracked yet",
      actionLabel: "Open Quest Helper",
      onAction: onGoToQuests,
    },
    {
      eyebrow: "Money Makers",
      title: "Profit surfaces are coming next",
      summary:
        "The advisor can already reason about money-making, low-attention profit, and unlock burden. A dedicated profit page can grow here later without changing the core workspace shape.",
      meta: "Advisor-backed now, dedicated page later",
      badge: "Soon",
    },
    {
      eyebrow: "Loadout Advice",
      title: selectedSnapshot?.summary.progression_profile?.highest_skill
        ? `${selectedSnapshot.summary.progression_profile.highest_skill} leaning account`
        : "Account loadout read",
      summary:
        selectedSnapshot?.summary.top_skills?.length
          ? `Top skills like ${selectedSnapshot.summary.top_skills.slice(0, 2).map((skill) => skill.skill).join(" and ")} are already shaping the advice lane for this account.`
          : "Once an account is synced, Cerebro can read more of the account's current shape and turn that into better loadout advice.",
      meta: selectedAccount ? `${selectedAccount.rsn} selected` : "No active account",
      actionLabel: "Open Recommendations",
      onAction: onGoToRecommendations,
    },
  ];

  const quickPrompts = [
    "What should I ask Cerebro about this account first?",
    "What is my strongest stat right now?",
    "How do I get to Fossil Island quickly?",
    "What should I do next on this account?",
    "Where am I losing momentum?",
  ];

  return (
    <div className="space-y-5">
      <HeroPanel
        bankValue={formatBankValue(selectedProgress)}
        combatLevel={selectedSnapshot?.summary.combat_level ?? null}
        displayName={profile?.display_name ?? currentUser.display_name}
        overallLevel={selectedSnapshot?.summary.overall_level ?? null}
        questPoints={formatQuestPoints(selectedProgress)}
        selectedAccountRsn={selectedAccount?.rsn ?? profile?.primary_account_rsn ?? null}
      />
      <TelemetryBoard
        nextActions={nextActions}
        progress={selectedProgress}
        selectedAccountRsn={selectedAccount?.rsn ?? profile?.primary_account_rsn ?? null}
        snapshot={selectedSnapshot}
      />
      <WorkspaceSetupPanel
        accountCount={accountCount}
        busyAction={busyAction}
        currentUserName={currentUser.display_name}
        goalCount={goals.length}
        newAccountRsn={newAccountRsn}
        onChangeNewAccountRsn={onChangeNewAccountRsn}
        onGoToGoals={onGoToGoals}
        onGoToProfile={onGoToProfile}
        onQuickstartAccount={onQuickstartAccount}
        onQuickstartGoal={onQuickstartGoal}
        primaryAccountRsn={profile?.primary_account_rsn ?? null}
        workspaceChecklist={workspaceChecklist}
        workspaceProgress={workspaceProgress}
      />
      <FeatureGrid items={featureItems} />
      <AdvisorConsole
        busy={busyAction === "chat"}
        chatHistory={chatHistory}
        chatPrompt={chatPrompt}
        chatReply={chatReply}
        onOpenAdvisor={onGoToAdvisor}
        onPromptChange={onPromptChange}
        onRunQuickPrompt={onRunChatPrompt}
        onSubmit={() => onRunChatPrompt()}
        quickPrompts={quickPrompts}
      />
    </div>
  );
}
