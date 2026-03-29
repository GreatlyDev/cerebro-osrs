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

type DashboardPageProps = {
  currentUser: AuthUser;
  profile: Profile | null;
  goals: Goal[];
  nextActions: NextActionResponse | null;
  selectedAccount: { rsn: string } | null;
  selectedProgress: AccountProgress | null;
  selectedSnapshot: AccountSnapshot | null;
  chatHistory: ChatExchange[];
  chatPrompt: string;
  chatReply: string;
  onPromptChange: (value: string) => void;
  onRunChatPrompt: (promptOverride?: string) => void;
  onOpenNextAction: (action: NextAction) => void;
  onGoToGoals: () => void;
  onGoToGear: () => void;
  onGoToQuests: () => void;
  onGoToRecommendations: () => void;
  onGoToSkills: () => void;
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
    nextActions,
    selectedAccount,
    selectedProgress,
    selectedSnapshot,
    chatHistory,
    chatPrompt,
    chatReply,
    onPromptChange,
    onRunChatPrompt,
    onOpenNextAction,
    onGoToGoals,
    onGoToGear,
    onGoToQuests,
    onGoToRecommendations,
    onGoToSkills,
  } = props;

  const topAction = nextActions?.top_action ?? null;
  const featureItems = [
    {
      eyebrow: "Goal Path",
      title: goals[0]?.title ?? "Anchor your first goal",
      summary:
        goals.length > 0
          ? `${goals.length} goal${goals.length > 1 ? "s" : ""} are shaping the planner right now, with ${goals[0]?.title} currently leading the workspace.`
          : "Turn the workspace from a broad advisor into a sharper planning engine by anchoring it to one real goal.",
      meta: goals.length > 0 ? `${goals[0]?.status} • ${goals[0]?.target_account_rsn ?? "workspace-wide"}` : "No goals yet",
      actionLabel: goals.length > 0 ? "Open Goal Planner" : "Create First Goal",
      onAction: onGoToGoals,
    },
    {
      eyebrow: "Gear Optimizer",
      title: topAction?.action_type === "gear" ? topAction.title : "Loadout upgrade lane",
      summary:
        topAction?.action_type === "gear"
          ? topAction.summary
          : "Use Cerebro’s gear surface to turn snapshot context into cleaner upgrade ladders for the current account.",
      meta: selectedProgress?.owned_gear.length
        ? `${selectedProgress.owned_gear.length} tracked gear item${selectedProgress.owned_gear.length > 1 ? "s" : ""}`
        : "No gear tracked yet",
      actionLabel: "Open Gear Optimizer",
      onAction: onGoToGear,
    },
    {
      eyebrow: "Money Makers",
      title: "Profit surfaces are coming next",
      summary:
        "This dashboard keeps the slot warm with a premium placeholder now, then we can connect real moneymaker logic once that backend surface exists.",
      meta: "Planned surface",
      badge: "Soon",
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
      eyebrow: "Loadout Advice",
      title: selectedSnapshot?.summary.progression_profile?.highest_skill
        ? `${selectedSnapshot.summary.progression_profile.highest_skill} leaning account`
        : "Account loadout read",
      summary:
        selectedSnapshot?.summary.top_skills?.length
          ? `Top skills like ${selectedSnapshot.summary.top_skills.slice(0, 2).map((skill) => skill.skill).join(" and ")} are already shaping the advice lane for this account.`
          : "Once an account is synced, Cerebro can read more of the account’s current shape and turn that into better loadout advice.",
      meta: selectedAccount ? `${selectedAccount.rsn} selected` : "No active account",
      actionLabel: "Open Recommendations",
      onAction: onGoToRecommendations,
    },
  ];

  const quickPrompts = [
    "What should I do next on this account?",
    "Which quest unlock is worth chasing right now?",
    "Where am I losing momentum?",
    "What changed since the last sync?",
  ];

  return (
    <div className="space-y-6">
      <HeroPanel
        bankValue={formatBankValue(selectedProgress)}
        combatLevel={selectedSnapshot?.summary.combat_level ?? null}
        displayName={profile?.display_name ?? currentUser.display_name}
        questPoints={formatQuestPoints(selectedProgress)}
        selectedAccountRsn={selectedAccount?.rsn ?? profile?.primary_account_rsn ?? null}
      />
      <FeatureGrid items={featureItems} />
      <AdvisorConsole
        busy={false}
        chatHistory={chatHistory}
        chatPrompt={chatPrompt}
        chatReply={chatReply}
        onPromptChange={onPromptChange}
        onRunQuickPrompt={onRunChatPrompt}
        onSubmit={() => onRunChatPrompt()}
        quickPrompts={quickPrompts}
      />
    </div>
  );
}
