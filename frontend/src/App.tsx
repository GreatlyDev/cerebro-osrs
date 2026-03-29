import { Fragment, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "./api";
import { storeSessionToken } from "./api";
import { DashboardUtilityRail } from "./components/dashboard/DashboardUtilityRail";
import { AppShell } from "./components/layout/AppShell";
import { SidebarNav, type SidebarNavItem } from "./components/navigation/SidebarNav";
import { AccountDetailView as AccountDetailPageView } from "./pages/AccountDetail";
import { AuthView as AuthScreen } from "./pages/Auth";
import { ChatView } from "./pages/Chat";
import { DashboardPage } from "./pages/Dashboard";
import { GearDetailView } from "./pages/GearDetail";
import { GearView } from "./pages/Gear";
import { GoalDetailView as GoalDetailPageView } from "./pages/GoalDetail";
import { GoalsView } from "./pages/Goals";
import { ProfileView } from "./pages/Profile";
import { QuestDetailView } from "./pages/QuestDetail";
import { QuestsView } from "./pages/Quests";
import { RecommendationsView } from "./pages/Recommendations";
import { SkillDetailView } from "./pages/SkillDetail";
import { SkillsView } from "./pages/Skills";
import { TeleportDetailView } from "./pages/TeleportDetail";
import { TeleportsView } from "./pages/Teleports";
import type {
  Account,
  AccountProgress,
  AccountSnapshot,
  AuthUser,
  ChatExchange,
  ChatSession,
  GearRecommendationResponse,
  Goal,
  GoalPlanResponse,
  NextAction,
  NextActionResponse,
  Profile,
  QuestDetail,
  QuestSummary,
  SkillCatalogItem,
  SkillRecommendationResponse,
  TeleportRouteResponse,
} from "./types";

type ViewKey =
  | "dashboard"
  | "ask-cerebro"
  | "recommendations"
  | "skills"
  | "quests"
  | "gear"
  | "teleports"
  | "goals"
  | "profile";

const NAV_ITEMS: Array<{ key: ViewKey; label: string; blurb: string }> = [
  { key: "dashboard", label: "Dashboard", blurb: "Summary, actions, and sync flow" },
  { key: "ask-cerebro", label: "Ask Cerebro", blurb: "Structured chat over the backend" },
  { key: "recommendations", label: "Recommendations", blurb: "Ranked actions and planner context" },
  { key: "skills", label: "Skills", blurb: "Training surfaces and recommendations" },
  { key: "quests", label: "Quests", blurb: "Catalog and progression targets" },
  { key: "gear", label: "Gear", blurb: "Upgrade intelligence coming next" },
  { key: "teleports", label: "Teleports", blurb: "Route planning surfaces" },
  { key: "goals", label: "Goals", blurb: "Active goals and generated plans" },
  { key: "profile", label: "Profile", blurb: "Preferences and account defaults" },
];

const VIEW_PATHS: Record<ViewKey, string> = {
  dashboard: "/",
  "ask-cerebro": "/chat",
  recommendations: "/recommendations",
  skills: "/skills",
  quests: "/quests",
  gear: "/gear",
  teleports: "/teleports",
  goals: "/goals",
  profile: "/profile",
};

const ACCOUNT_PROGRESS_SUGGESTIONS = {
  completed_quests: ["bone voyage", "waterfall quest", "recipe for disaster", "monkey madness ii"],
  unlocked_transports: ["digsite pendant", "fairy rings", "100 museum kudos", "spirit tree access"],
  owned_gear: ["ahrim's robes", "toxic trident", "whip", "fighter torso"],
  active_unlocks: ["quest cape", "barrows gloves", "fire cape", "zulrah ready"],
} as const;

function getViewFromPath(pathname: string): ViewKey {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  for (const [view, path] of Object.entries(VIEW_PATHS) as Array<[ViewKey, string]>) {
    if (path === normalizedPath) {
      return view;
    }
  }

  return "dashboard";
}

function getAccountDetailIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/accounts\/(\d+)\/?$/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function getGoalDetailIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/goals\/(\d+)\/?$/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function getQuestDetailIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/quests\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }
  return match[1];
}

function getSkillDetailKeyFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/skills\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }
  return match[1];
}

function isGearDetailPath(pathname: string): boolean {
  return /^\/gear\/current\/?$/.test(pathname);
}

function isTeleportDetailPath(pathname: string): boolean {
  return /^\/teleports\/current\/?$/.test(pathname);
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildWorkspaceChecklist(profile: Profile | null, accounts: Account[], goals: Goal[]) {
  return [
    {
      title: "Set your planning baseline",
      done: Boolean(profile?.display_name && profile?.goals_focus && profile?.play_style),
      detail: "Profile preferences shape recommendation tone and default goal direction.",
    },
    {
      title: "Link at least one RuneScape account",
      done: accounts.length > 0,
      detail: "Accounts unlock sync, snapshots, rankings, and account-specific advice.",
    },
    {
      title: "Pick a primary RSN",
      done: Boolean(profile?.primary_account_rsn),
      detail: "A primary account makes recommendations feel like they belong to one workspace.",
    },
    {
      title: "Create your first real goal",
      done: goals.length > 0,
      detail: "Goals give the planner a real target instead of falling back to generic guidance.",
    },
  ];
}

function getSuggestedGoalType(profile: Profile | null): string {
  const focus = profile?.goals_focus?.toLowerCase();
  if (focus === "quest cape") {
    return "quest cape";
  }
  if (focus === "bossing") {
    return "fire cape";
  }
  return "quest cape";
}

function getSuggestedGoalTitle(goalType: string, accountRsn: string | null): string {
  const prefix = accountRsn ? `${accountRsn} ` : "";
  if (goalType === "fire cape") {
    return `${prefix}Fire Cape Push`.trim();
  }
  if (goalType === "barrows gloves") {
    return `${prefix}Barrows Gloves Plan`.trim();
  }
  return `${prefix}Quest Cape Plan`.trim();
}

function formatListDraft(value: string[]): string {
  return value.join("\n");
}

function parseListDraft(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendListDraft(currentValue: string, entry: string): string {
  const existing = new Set(parseListDraft(currentValue).map((item) => item.toLowerCase()));
  if (existing.has(entry.toLowerCase())) {
    return currentValue;
  }

  const trimmed = currentValue.trim();
  return trimmed ? `${trimmed}\n${entry}` : entry;
}

function emptyProgressDraft() {
  return {
    completed_quests: "",
    unlocked_transports: "",
    owned_gear: "",
    active_unlocks: "",
  };
}

function buildSnapshotDelta(current: AccountSnapshot | null, previous: AccountSnapshot | null) {
  if (!current || !previous) {
    return null;
  }

  const overallLevelDelta = current.summary.overall_level - previous.summary.overall_level;
  const combatLevelDelta =
    (current.summary.combat_level ?? 0) - (previous.summary.combat_level ?? 0);
  const currentSkills = new Map(
    (current.summary.top_skills ?? []).map((skill) => [skill.skill, skill.level]),
  );
  const improvedSkills = (previous.summary.top_skills ?? [])
    .map((skill) => ({
      skill: skill.skill,
      previousLevel: skill.level,
      currentLevel: currentSkills.get(skill.skill),
    }))
    .filter((skill) => skill.currentLevel !== undefined && skill.currentLevel > skill.previousLevel);

  return {
    overallLevelDelta,
    combatLevelDelta,
    improvedSkills,
    currentSyncAt: current.created_at,
    previousSyncAt: previous.created_at,
    newNinetyPlusCount:
      (current.summary.progression_profile?.total_skills_at_90_plus ?? 0) -
      (previous.summary.progression_profile?.total_skills_at_90_plus ?? 0),
  };
}

function buildSnapshotTrend(history: AccountSnapshot[]) {
  if (history.length === 0) {
    return null;
  }

  const latest = history[0];
  const oldest = history[history.length - 1];
  const maxOverall = Math.max(...history.map((snapshot) => snapshot.summary.overall_level), 1);
  const maxCombat = Math.max(...history.map((snapshot) => snapshot.summary.combat_level ?? 0), 1);
  const skillGainMap = new Map<string, number>();

  for (let index = history.length - 1; index > 0; index -= 1) {
    const older = history[index];
    const newer = history[index - 1];
    const olderSkills = new Map(
      (older.summary.top_skills ?? []).map((skill) => [skill.skill, skill.level]),
    );

    for (const skill of newer.summary.top_skills ?? []) {
      const previousLevel = olderSkills.get(skill.skill);
      if (previousLevel === undefined) {
        continue;
      }
      const delta = skill.level - previousLevel;
      if (delta > 0) {
        skillGainMap.set(skill.skill, (skillGainMap.get(skill.skill) ?? 0) + delta);
      }
    }
  }

  const topSkillMovers = Array.from(skillGainMap.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([skill, delta]) => ({ skill, delta }));

  return {
    latest,
    oldest,
    syncCount: history.length,
    overallGain: latest.summary.overall_level - oldest.summary.overall_level,
    combatGain: (latest.summary.combat_level ?? 0) - (oldest.summary.combat_level ?? 0),
    topSkillMovers,
    points: history.map((snapshot, index) => ({
      id: snapshot.id,
      label: index === 0 ? "Latest" : index === history.length - 1 ? "Oldest" : `Sync ${history.length - index}`,
      createdAt: snapshot.created_at,
      overall: snapshot.summary.overall_level,
      combat: snapshot.summary.combat_level ?? 0,
      overallPercent: Math.max((snapshot.summary.overall_level / maxOverall) * 100, 8),
      combatPercent: Math.max(((snapshot.summary.combat_level ?? 0) / maxCombat) * 100, 8),
      status: snapshot.sync_status,
    })),
  };
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = getViewFromPath(location.pathname);
  const accountDetailId = getAccountDetailIdFromPath(location.pathname);
  const goalDetailId = getGoalDetailIdFromPath(location.pathname);
  const questDetailId = getQuestDetailIdFromPath(location.pathname);
  const skillDetailKey = getSkillDetailKeyFromPath(location.pathname);
  const gearDetailOpen = isGearDetailPath(location.pathname);
  const teleportDetailOpen = isTeleportDetailPath(location.pathname);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalPlan, setSelectedGoalPlan] = useState<GoalPlanResponse | null>(null);
  const [nextActions, setNextActions] = useState<NextActionResponse | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AccountSnapshot | null>(null);
  const [selectedSnapshotHistory, setSelectedSnapshotHistory] = useState<AccountSnapshot[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<AccountProgress | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const stored = window.localStorage.getItem("cerebro.selectedAccountId");
    return stored ? Number(stored) : null;
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatExchange[]>([]);
  const [selectedChatSessionId, setSelectedChatSessionId] = useState<number | null>(null);
  const [chatReply, setChatReply] = useState("");
  const [chatPrompt, setChatPrompt] = useState("What's my next best action?");
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [skillRecommendations, setSkillRecommendations] =
    useState<SkillRecommendationResponse | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<QuestDetail | null>(null);
  const [questSearch, setQuestSearch] = useState("");
  const [gearRecommendations, setGearRecommendations] =
    useState<GearRecommendationResponse | null>(null);
  const [teleportRoute, setTeleportRoute] = useState<TeleportRouteResponse | null>(null);
  const [newAccountRsn, setNewAccountRsn] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalType, setNewGoalType] = useState("quest cape");
  const [newGoalTargetRsn, setNewGoalTargetRsn] = useState("");
  const [gearCombatStyle, setGearCombatStyle] = useState("magic");
  const [gearBudgetTier, setGearBudgetTier] = useState("midgame");
  const [gearCurrentItems, setGearCurrentItems] = useState("");
  const [teleportDestination, setTeleportDestination] = useState("fossil island");
  const [teleportPreference, setTeleportPreference] = useState("balanced");
  const [progressDraft, setProgressDraft] = useState(emptyProgressDraft);
  const [profileDraft, setProfileDraft] = useState({
    display_name: "",
    primary_account_rsn: "",
    play_style: "balanced",
    goals_focus: "progression",
    prefers_afk_methods: false,
    prefers_profitable_methods: false,
  });
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    void initializeApplication();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cerebro.activeView", activeView);
    }
  }, [activeView]);

  useEffect(() => {
    if (
      location.pathname !== "/" &&
      !(Object.values(VIEW_PATHS) as string[]).includes(location.pathname) &&
      getAccountDetailIdFromPath(location.pathname) === null &&
      getGoalDetailIdFromPath(location.pathname) === null &&
      getQuestDetailIdFromPath(location.pathname) === null &&
      getSkillDetailKeyFromPath(location.pathname) === null &&
      !isGearDetailPath(location.pathname) &&
      !isTeleportDetailPath(location.pathname)
    ) {
      navigate(VIEW_PATHS.dashboard, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (selectedAccountId === null) {
      window.localStorage.removeItem("cerebro.selectedAccountId");
      return;
    }
    window.localStorage.setItem("cerebro.selectedAccountId", String(selectedAccountId));
  }, [selectedAccountId]);

  useEffect(() => {
    if (activeView === "skills" && skills.length === 0) {
      void api
        .listSkills()
        .then((response) => {
          setSkills(response.items);
        })
        .catch((err: Error) => setError(err.message));
    }

    if (activeView === "quests" && quests.length === 0) {
      void api
        .listQuests()
        .then((response) => {
          setQuests(response.items);
        })
        .catch((err: Error) => setError(err.message));
    }

    if (activeView === "ask-cerebro" && chatSessions.length === 0) {
      void api
        .listChatSessions()
        .then((response) => {
          setChatSessions(response.items);
        })
        .catch((err: Error) => setError(err.message));
    }
  }, [activeView, chatSessions.length, quests.length, skills.length]);

  function navigateToView(view: ViewKey) {
    navigate(VIEW_PATHS[view]);
  }

  async function initializeApplication() {
    setLoading(true);
    setError(null);
    setBackendStatus("checking");
    try {
      const healthResponse = await api.getHealth();
      setBackendStatus(healthResponse.status === "ok" ? "online" : "offline");
      try {
        const user = await api.getSession();
        setCurrentUser(user);
        await loadDashboard({ skipHealthCheck: true });
      } catch {
        setCurrentUser(null);
      }
    } catch (err) {
      setBackendStatus("offline");
      setError(err instanceof Error ? err.message : "Unable to reach Cerebro.");
    } finally {
      setAuthReady(true);
      setLoading(false);
    }
  }

  async function loadDashboard(options?: { skipHealthCheck?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      if (!options?.skipHealthCheck) {
        setBackendStatus("checking");
        const healthResponse = await api.getHealth();
        setBackendStatus(healthResponse.status === "ok" ? "online" : "offline");
      }

      const [profileResponse, accountsResponse, goalsResponse, nextActionsResponse] =
        await Promise.all([
          api.getProfile(),
          api.listAccounts(),
          api.listGoals(),
          api.getNextActions({ limit: 4 }),
        ]);
      setProfile(profileResponse);
      setProfileDraft({
        display_name: profileResponse.display_name,
        primary_account_rsn: profileResponse.primary_account_rsn ?? "",
        play_style: profileResponse.play_style,
        goals_focus: profileResponse.goals_focus,
        prefers_afk_methods: profileResponse.prefers_afk_methods,
        prefers_profitable_methods: profileResponse.prefers_profitable_methods,
      });
      setAccounts(accountsResponse.items);
      setGoals(goalsResponse.items);
      setNextActions(nextActionsResponse);

      if (accountsResponse.items.length > 0) {
        const latestAccount =
          accountsResponse.items.find((account) => account.id === selectedAccountId) ??
          accountsResponse.items[accountsResponse.items.length - 1];
        const [latestSnapshot, latestProgress, latestHistory] = await Promise.all([
          api.getAccountSnapshot(latestAccount.id).catch(() => null),
          api.getAccountProgress(latestAccount.id).catch(() => null),
          api.listAccountSnapshots(latestAccount.id, 2).then((response) => response.items).catch(() => []),
        ]);
        setSelectedSnapshot(latestSnapshot);
        setSelectedSnapshotHistory(latestHistory);
        setSelectedProgress(latestProgress);
        setProgressDraft({
          completed_quests: formatListDraft(latestProgress?.completed_quests ?? []),
          unlocked_transports: formatListDraft(latestProgress?.unlocked_transports ?? []),
          owned_gear: formatListDraft(latestProgress?.owned_gear ?? []),
          active_unlocks: formatListDraft(latestProgress?.active_unlocks ?? []),
        });
        setSelectedAccountId(latestAccount.id);
      } else {
        setSelectedSnapshot(null);
        setSelectedSnapshotHistory([]);
        setSelectedProgress(null);
        setSelectedAccountId(null);
        setProgressDraft(emptyProgressDraft());
      }
    } catch (err) {
      if (!options?.skipHealthCheck) {
        setBackendStatus("offline");
      }
      setError(err instanceof Error ? err.message : "Unable to load your workspace.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSubmit() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Email and password are both required.");
      return;
    }
    if (authMode === "register" && loginPassword.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusyAction("login");
    setError(null);
    try {
      const payload = {
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        display_name: loginDisplayName.trim() || null,
      };
      const session =
        authMode === "register"
          ? await api.register(payload)
          : await api.login(payload);
      storeSessionToken(session.session_token);
      setCurrentUser(session.user);
      setLoginPassword("");
      await loadDashboard({ skipHealthCheck: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDevLogin() {
    if (!loginEmail.trim()) {
      return;
    }
    setBusyAction("login");
    setError(null);
    try {
      const session = await api.devLogin({
        email: loginEmail.trim(),
        display_name: loginDisplayName.trim() || null,
      });
      storeSessionToken(session.session_token);
      setCurrentUser(session.user);
      await loadDashboard({ skipHealthCheck: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut() {
    try {
      await api.logout();
    } catch {
      // Local cleanup still matters if the backend session was already gone.
    } finally {
      storeSessionToken(null);
      setCurrentUser(null);
      setProfile(null);
      setAccounts([]);
      setGoals([]);
      setNextActions(null);
      setSelectedGoalPlan(null);
      setSelectedSnapshot(null);
      setSelectedSnapshotHistory([]);
      setSelectedProgress(null);
      setSelectedAccountId(null);
      setChatSessions([]);
      setChatHistory([]);
      setChatReply("");
      setProgressDraft(emptyProgressDraft());
      setError(null);
      setLoginPassword("");
    }
  }

  async function handleCreateAccount() {
    if (!newAccountRsn.trim()) {
      return;
    }
    setBusyAction("create-account");
    setError(null);
    try {
      await api.createAccount(newAccountRsn.trim());
      setNewAccountRsn("");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSetPrimaryAccount(account: Account) {
    setBusyAction(`primary-${account.id}`);
    setError(null);
    try {
      const updated = await api.updateProfile({
        primary_account_rsn: account.rsn,
      });
      setProfile(updated);
      setProfileDraft((current) => ({
        ...current,
        primary_account_rsn: updated.primary_account_rsn ?? "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set the primary account.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleQuickstartAccount() {
    if (!newAccountRsn.trim()) {
      return;
    }
    setBusyAction("quickstart-account");
    setError(null);
    try {
      const account = await api.createAccount(newAccountRsn.trim());
      await api.syncAccount(account.id);
      const snapshot = await api.getAccountSnapshot(account.id);
      const updatedProfile = await api.updateProfile({
        primary_account_rsn: account.rsn,
      });
      setNewAccountRsn("");
      setSelectedSnapshot(snapshot);
      setSelectedAccountId(account.id);
      setProfile(updatedProfile);
      setProfileDraft((current) => ({
        ...current,
        primary_account_rsn: updatedProfile.primary_account_rsn ?? "",
      }));
      await loadDashboard();
      navigateToView("goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to finish the quick account setup.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSyncAccount(account: Account) {
    setBusyAction(`sync-${account.id}`);
    setError(null);
    try {
      await api.syncAccount(account.id);
      const [snapshot, progress, history] = await Promise.all([
        api.getAccountSnapshot(account.id),
        api.getAccountProgress(account.id).catch(() => null),
        api.listAccountSnapshots(account.id, 2).then((response) => response.items).catch(() => []),
      ]);
      setSelectedSnapshot(snapshot);
      setSelectedSnapshotHistory(history);
      setSelectedProgress(progress);
      setProgressDraft({
        completed_quests: formatListDraft(progress?.completed_quests ?? []),
        unlocked_transports: formatListDraft(progress?.unlocked_transports ?? []),
        owned_gear: formatListDraft(progress?.owned_gear ?? []),
        active_unlocks: formatListDraft(progress?.active_unlocks ?? []),
      });
      setSelectedAccountId(account.id);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sync account.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGeneratePlan(goal: Goal) {
    setBusyAction(`plan-${goal.id}`);
    setError(null);
    try {
      const plan = await api.generateGoalPlan(goal.id);
      setSelectedGoalPlan(plan);
      navigate(`/goals/${goal.id}`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate goal plan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateGoal() {
    if (!newGoalTitle.trim() || !newGoalType.trim()) {
      return;
    }
    setBusyAction("create-goal");
    setError(null);
    try {
      const goal = await api.createGoal({
        title: newGoalTitle.trim(),
        goal_type: newGoalType.trim(),
        target_account_rsn: newGoalTargetRsn.trim() || null,
      });
      setNewGoalTitle("");
      setNewGoalTargetRsn("");
      const plan = await api.generateGoalPlan(goal.id);
      setSelectedGoalPlan(plan);
      await loadDashboard();
      navigateToView("goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create goal.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleQuickstartGoal() {
    const goalType = getSuggestedGoalType(profile);
    const targetRsn = selectedAccountRsn ?? profile?.primary_account_rsn ?? null;
    const title = getSuggestedGoalTitle(goalType, targetRsn);

    setBusyAction("quickstart-goal");
    setError(null);
    try {
      const goal = await api.createGoal({
        title,
        goal_type: goalType,
        target_account_rsn: targetRsn,
      });
      const plan = await api.generateGoalPlan(goal.id);
      setSelectedGoalPlan(plan);
      await loadDashboard();
      navigateToView("goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the first goal.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRunChatPrompt(promptOverride?: string) {
    const prompt = (promptOverride ?? chatPrompt).trim();
    if (!prompt) {
      return;
    }
    setBusyAction("chat");
    setError(null);
    try {
      let session =
        chatSessions.find((item) => item.id === selectedChatSessionId) ?? chatSessions[0];
      if (!session) {
        session = await api.createChatSession("Frontend Prompt");
        setChatSessions((current) => [session, ...current]);
      }
      setSelectedChatSessionId(session.id);
      const reply = await api.sendChatMessage(session.id, prompt);
      setChatReply(reply.assistant_message.content);
      setChatHistory((current) => [
        {
          prompt,
          reply: reply.assistant_message.content,
          sessionId: session.id,
        },
        ...current,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send chat prompt.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadSkill(skillKey: string, options?: { openPage?: boolean }) {
    setBusyAction(`skill-${skillKey}`);
    setError(null);
    try {
      const response = await api.getSkillRecommendations(skillKey, selectedAccountRsn);
      setSkillRecommendations(response);
      if (options?.openPage ?? true) {
        navigate(`/skills/${skillKey}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load skill recommendations.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleInspectAccount(account: Account, options?: { openPage?: boolean }) {
    setBusyAction(`inspect-${account.id}`);
    setError(null);
    try {
      const [snapshot, progress, history] = await Promise.all([
        api.getAccountSnapshot(account.id),
        api.getAccountProgress(account.id).catch(() => null),
        api.listAccountSnapshots(account.id, 2).then((response) => response.items).catch(() => []),
      ]);
      setSelectedSnapshot(snapshot);
      setSelectedSnapshotHistory(history);
      setSelectedProgress(progress);
      setProgressDraft({
        completed_quests: formatListDraft(progress?.completed_quests ?? []),
        unlocked_transports: formatListDraft(progress?.unlocked_transports ?? []),
        owned_gear: formatListDraft(progress?.owned_gear ?? []),
        active_unlocks: formatListDraft(progress?.active_unlocks ?? []),
      });
      setSelectedAccountId(account.id);
      if (options?.openPage ?? true) {
        navigate(`/accounts/${account.id}`);
      } else {
        navigateToView("dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No snapshot found for that account yet.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadQuest(questId: string, options?: { openPage?: boolean }) {
    setBusyAction(`quest-${questId}`);
    setError(null);
    try {
      const quest = await api.getQuest(questId);
      setSelectedQuest(quest);
      if (options?.openPage ?? true) {
        navigate(`/quests/${questId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load quest.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleOpenNextAction(action: NextAction) {
    if (action.action_type === "quest") {
      const questId = action.target.quest_id;
      if (typeof questId === "string" && questId.length > 0) {
        void handleLoadQuest(questId);
        return;
      }
    }

    if (action.action_type === "skill") {
      const skill = action.target.skill;
      if (typeof skill === "string" && skill.length > 0) {
        void handleLoadSkill(skill);
      } else {
        navigateToView("skills");
      }
      return;
    }

    if (action.action_type === "gear") {
      navigateToView("gear");
      return;
    }

    if (action.action_type === "travel") {
      navigateToView("teleports");
      return;
    }

    const accountRsn = action.target.account_rsn;
    if (typeof accountRsn === "string") {
      const account = accounts.find((entry) => entry.rsn === accountRsn);
      if (account) {
        void handleInspectAccount(account);
        return;
      }
    }
  }

  async function handleLoadGear() {
    setBusyAction("gear");
    setError(null);
    try {
      const response = await api.getGearRecommendations({
        combat_style: gearCombatStyle,
        budget_tier: gearBudgetTier,
        current_gear: gearCurrentItems
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        account_rsn: selectedAccountRsn,
      });
      setGearRecommendations(response);
      navigate("/gear/current");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gear suggestions.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadTeleport() {
    setBusyAction("teleport");
    setError(null);
    try {
      const response = await api.getTeleportRoute({
        destination: teleportDestination,
        preference: teleportPreference === "balanced" ? null : teleportPreference,
        account_rsn: selectedAccountRsn,
      });
      setTeleportRoute(response);
      navigate("/teleports/current");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load teleport route.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveProfile() {
    setBusyAction("profile");
    setError(null);
    try {
      const updated = await api.updateProfile({
        display_name: profileDraft.display_name,
        primary_account_rsn: profileDraft.primary_account_rsn || null,
        play_style: profileDraft.play_style,
        goals_focus: profileDraft.goals_focus,
        prefers_afk_methods: profileDraft.prefers_afk_methods,
        prefers_profitable_methods: profileDraft.prefers_profitable_methods,
      });
      setProfile(updated);
      await loadDashboard();
      navigateToView("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveAccountProgress() {
    if (!selectedAccount) {
      return;
    }

    setBusyAction("account-progress");
    setError(null);
    try {
      const updated = await api.updateAccountProgress(selectedAccount.id, {
        completed_quests: parseListDraft(progressDraft.completed_quests),
        unlocked_transports: parseListDraft(progressDraft.unlocked_transports),
        owned_gear: parseListDraft(progressDraft.owned_gear),
        active_unlocks: parseListDraft(progressDraft.active_unlocks),
      });
      setSelectedProgress(updated);
      setProgressDraft({
        completed_quests: formatListDraft(updated.completed_quests),
        unlocked_transports: formatListDraft(updated.unlocked_transports),
        owned_gear: formatListDraft(updated.owned_gear),
        active_unlocks: formatListDraft(updated.active_unlocks),
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save account progress.");
    } finally {
      setBusyAction(null);
    }
  }

  const filteredSkills = skills.filter((skill) =>
    `${skill.label} ${skill.category}`.toLowerCase().includes(skillSearch.trim().toLowerCase()),
  );

  const filteredQuests = quests.filter((quest) =>
    `${quest.name} ${quest.category} ${quest.difficulty} ${quest.recommendation_reason}`
      .toLowerCase()
      .includes(questSearch.trim().toLowerCase()),
  );
  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null;
  const selectedAccountRsn = selectedAccount?.rsn ?? null;
  const selectedGoal =
    goals.find((goal) => goal.id === goalDetailId) ??
    (selectedGoalPlan ? goals.find((goal) => goal.id === selectedGoalPlan.goal_id) : null) ??
    null;
  const snapshotDelta = buildSnapshotDelta(
    selectedSnapshotHistory[0] ?? selectedSnapshot,
    selectedSnapshotHistory[1] ?? null,
  );
  const workspaceChecklist = buildWorkspaceChecklist(profile, accounts, goals);
  const workspaceProgress = workspaceChecklist.filter((item) => item.done).length;

  useEffect(() => {
    if (selectedAccountRsn && !newGoalTargetRsn) {
      setNewGoalTargetRsn(selectedAccountRsn);
    }
  }, [selectedAccountRsn, newGoalTargetRsn]);

  useEffect(() => {
    if (accountDetailId === null || accounts.length === 0) {
      return;
    }
    if (selectedAccountId === accountDetailId) {
      return;
    }
    const account = accounts.find((item) => item.id === accountDetailId);
    if (account) {
      void handleInspectAccount(account, { openPage: false });
    }
  }, [accountDetailId, accounts, selectedAccountId]);

  useEffect(() => {
    if (questDetailId === null) {
      return;
    }
    if (selectedQuest?.id === questDetailId) {
      return;
    }
    void handleLoadQuest(questDetailId, { openPage: false });
  }, [questDetailId, selectedQuest?.id]);

  useEffect(() => {
    if (skillDetailKey === null) {
      return;
    }
    if (skillRecommendations?.skill === skillDetailKey) {
      return;
    }
    void handleLoadSkill(skillDetailKey, { openPage: false });
  }, [skillDetailKey, skillRecommendations?.skill, selectedAccountRsn]);

  function handleSelectAccount(accountId: number | null) {
    setSelectedAccountId(accountId);

    if (accountId === null) {
      setSelectedSnapshot(null);
      setSelectedSnapshotHistory([]);
      setSelectedProgress(null);
      setProgressDraft(emptyProgressDraft());
      return;
    }

    const account = accounts.find((item) => item.id === accountId);
    if (account) {
      void handleInspectAccount(account, { openPage: accountDetailId !== null });
    }
  }

  if (!authReady) {
    return <div className="app-shell auth-shell"><div className="banner">Loading Cerebro...</div></div>;
  }

  if (backendStatus === "offline" && !currentUser) {
    return (
      <AuthScreen
        authMode={authMode}
        backendStatus={backendStatus}
        busyAction={busyAction}
        error={error}
        loginDisplayName={loginDisplayName}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        onLogin={handleDevLogin}
        onPasswordSubmit={handleAuthSubmit}
        setAuthMode={setAuthMode}
        setLoginDisplayName={setLoginDisplayName}
        setLoginEmail={setLoginEmail}
        setLoginPassword={setLoginPassword}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        authMode={authMode}
        backendStatus={backendStatus}
        busyAction={busyAction}
        error={error}
        loginDisplayName={loginDisplayName}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        onLogin={handleDevLogin}
        onPasswordSubmit={handleAuthSubmit}
        setAuthMode={setAuthMode}
        setLoginDisplayName={setLoginDisplayName}
        setLoginEmail={setLoginEmail}
        setLoginPassword={setLoginPassword}
      />
    );
  }

  const primaryNavItems: SidebarNavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Command overview and live account read",
      active: activeView === "dashboard",
      onClick: () => navigateToView("dashboard"),
    },
    {
      id: "advisor",
      label: "Advisor",
      description: "AI-flavored planner console over your workspace",
      active: activeView === "ask-cerebro",
      onClick: () => navigateToView("ask-cerebro"),
    },
    {
      id: "gear-optimizer",
      label: "Gear Optimizer",
      description: "Upgrade ladders and loadout planning",
      active: activeView === "gear",
      onClick: () => navigateToView("gear"),
    },
    {
      id: "quest-helper",
      label: "Quest Helper",
      description: "Unlock-first quest guidance and progression gates",
      active: activeView === "quests",
      onClick: () => navigateToView("quests"),
    },
    {
      id: "money-makers",
      label: "Money Makers",
      description: "Profit routes and economy-aware planning are coming next",
      disabled: true,
      badge: "Soon",
    },
    {
      id: "goal-planner",
      label: "Goal Planner",
      description: "Anchor the workspace around progression targets",
      active: activeView === "goals",
      onClick: () => navigateToView("goals"),
    },
    {
      id: "saved-builds",
      label: "Saved Builds",
      description: "Preset account setups will live here later",
      disabled: true,
      badge: "Soon",
    },
    {
      id: "inventory",
      label: "Inventory",
      description: "A richer inventory and bank surface is planned",
      disabled: true,
      badge: "Soon",
    },
  ];

  const secondaryNavItems: SidebarNavItem[] = [
    {
      id: "skills",
      label: "Skills",
      description: "Live training methods and account-aware levels",
      active: activeView === "skills",
      onClick: () => navigateToView("skills"),
    },
    {
      id: "recommendations",
      label: "Recommendations",
      description: "Ranked next actions across the planner",
      active: activeView === "recommendations",
      onClick: () => navigateToView("recommendations"),
    },
    {
      id: "teleports",
      label: "Teleports",
      description: "Route planning and travel shortcuts",
      active: activeView === "teleports",
      onClick: () => navigateToView("teleports"),
    },
    {
      id: "profile",
      label: "Profile",
      description: "Workspace defaults, focus, and account steering",
      active: activeView === "profile",
      onClick: () => navigateToView("profile"),
    },
  ];

  return (
    <AppShell
      sidebar={
        <SidebarNav
          accounts={accounts}
          backendStatus={backendStatus}
          currentUser={currentUser}
          onSelectAccount={handleSelectAccount}
          onSignOut={handleSignOut}
          primaryItems={primaryNavItems}
          secondaryItems={secondaryNavItems}
          selectedAccountId={selectedAccountId}
        />
      }
      utilityRail={
        <DashboardUtilityRail
          goals={goals}
          nextActions={nextActions}
          selectedAccount={selectedAccount}
          selectedProgress={selectedProgress}
          selectedSnapshot={selectedSnapshot}
          selectedSnapshotDelta={snapshotDelta}
        />
      }
    >
      {error ? <div className="banner error-banner">{error}</div> : null}
      {loading ? <div className="banner">Loading Cerebro surfaces...</div> : null}

      {!loading ? (
        <>
          {activeView === "dashboard" ? (
            <DashboardPage
              accountCount={accounts.length}
              busyAction={busyAction}
              chatHistory={chatHistory}
              chatPrompt={chatPrompt}
              chatReply={chatReply}
              currentUser={currentUser}
              goals={goals}
              newAccountRsn={newAccountRsn}
              nextActions={nextActions}
              onChangeNewAccountRsn={setNewAccountRsn}
              onGoToGear={() => navigateToView("gear")}
              onGoToGoals={() => navigateToView("goals")}
              onGoToProfile={() => navigateToView("profile")}
              onGoToQuests={() => navigateToView("quests")}
              onGoToRecommendations={() => navigateToView("recommendations")}
              onGoToSkills={() => navigateToView("skills")}
              onOpenNextAction={handleOpenNextAction}
              onPromptChange={setChatPrompt}
              onQuickstartAccount={handleQuickstartAccount}
              onQuickstartGoal={handleQuickstartGoal}
              onRunChatPrompt={handleRunChatPrompt}
              profile={profile}
              selectedAccount={selectedAccount}
              selectedProgress={selectedProgress}
              selectedSnapshot={selectedSnapshot}
              workspaceChecklist={workspaceChecklist}
              workspaceProgress={workspaceProgress}
            />
          ) : null}

            {accountDetailId !== null ? (
              <AccountDetailPageView
                accountGoals={goals.filter((goal) => goal.target_account_rsn === selectedAccount?.rsn)}
                busyAction={busyAction}
                nextActions={nextActions}
                onBackToDashboard={() => navigateToView("dashboard")}
                onGeneratePlan={handleGeneratePlan}
                onGoToGoals={() => navigateToView("goals")}
                onSaveAccountProgress={handleSaveAccountProgress}
                onSetPrimaryAccount={handleSetPrimaryAccount}
                onSyncAccount={handleSyncAccount}
                profile={profile}
                progressDraft={progressDraft}
                selectedAccount={selectedAccount}
                selectedProgress={selectedProgress}
                selectedSnapshot={selectedSnapshot}
                selectedSnapshotDelta={snapshotDelta}
                selectedSnapshotHistory={selectedSnapshotHistory}
                setProgressDraft={setProgressDraft}
              />
            ) : null}

            {goalDetailId !== null ? (
              <GoalDetailPageView
                busyAction={busyAction}
                nextActions={nextActions}
                onBackToDashboard={() => navigateToView("dashboard")}
                onGeneratePlan={handleGeneratePlan}
                onGoToGoals={() => navigateToView("goals")}
                onOpenNextAction={handleOpenNextAction}
                onOpenRecommendedQuest={(questId) => void handleLoadQuest(questId)}
                onOpenTargetAccount={(rsn) => {
                  const account = accounts.find((entry) => entry.rsn === rsn);
                  if (account) {
                    void handleInspectAccount(account);
                  }
                }}
                profile={profile}
                selectedGoal={selectedGoal}
                selectedGoalPlan={selectedGoalPlan}
              />
            ) : null}

            {skillDetailKey !== null ? (
              <SkillDetailView
                onBackToDashboard={() => navigateToView("dashboard")}
                onBackToSkills={() => navigateToView("skills")}
                onReloadSkill={(skillKey) => void handleLoadSkill(skillKey)}
                selectedAccountRsn={selectedAccountRsn}
                skillRecommendations={skillRecommendations}
              />
            ) : null}

            {gearDetailOpen ? (
              <GearDetailView
                gearRecommendations={gearRecommendations}
                onBackToDashboard={() => navigateToView("dashboard")}
                onBackToGear={() => navigateToView("gear")}
                onReloadGear={handleLoadGear}
                selectedAccountRsn={selectedAccountRsn}
              />
            ) : null}

            {teleportDetailOpen ? (
              <TeleportDetailView
                onBackToDashboard={() => navigateToView("dashboard")}
                onBackToTeleports={() => navigateToView("teleports")}
                onReloadTeleport={handleLoadTeleport}
                selectedAccountRsn={selectedAccountRsn}
                teleportRoute={teleportRoute}
              />
            ) : null}

            {questDetailId !== null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <QuestDetailView
                onBackToDashboard={() => navigateToView("dashboard")}
                onBackToQuests={() => navigateToView("quests")}
                onOpenNextAction={handleOpenNextAction}
                nextActions={nextActions}
                selectedQuest={selectedQuest}
              />
            ) : null}

            {activeView === "ask-cerebro" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <ChatView
                busyAction={busyAction}
                chatHistory={chatHistory}
                chatPrompt={chatPrompt}
                chatReply={chatReply}
                chatSessions={chatSessions}
                onRunChatPrompt={handleRunChatPrompt}
                selectedChatSessionId={selectedChatSessionId}
                setSelectedChatSessionId={setSelectedChatSessionId}
                setChatPrompt={setChatPrompt}
                selectedAccountRsn={selectedAccountRsn}
              />
            ) : null}

            {activeView === "recommendations" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <RecommendationsView
                nextActions={nextActions}
                onOpenNextAction={handleOpenNextAction}
                onGoToGoals={() => navigateToView("goals")}
                selectedAccountRsn={selectedAccountRsn}
              />
            ) : null}

            {activeView === "skills" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <SkillsView
                busyAction={busyAction}
                filteredSkills={filteredSkills}
                onLoadSkill={(skillKey) => void handleLoadSkill(skillKey)}
                selectedAccountRsn={selectedAccountRsn}
                setSkillSearch={setSkillSearch}
                skillRecommendations={skillRecommendations}
                skillSearch={skillSearch}
              />
            ) : null}

            {activeView === "quests" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <QuestsView
                busyAction={busyAction}
                filteredQuests={filteredQuests}
                nextActions={nextActions}
                onLoadQuest={(questId) => void handleLoadQuest(questId)}
                onOpenSelectedQuest={() => {
                  if (selectedQuest) {
                    navigate(`/quests/${selectedQuest.id}`);
                  }
                }}
                questSearch={questSearch}
                selectedQuest={selectedQuest}
                setQuestSearch={setQuestSearch}
              />
            ) : null}

            {activeView === "goals" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <GoalsView
                busyAction={busyAction}
                goals={goals}
                newGoalTargetRsn={newGoalTargetRsn}
                newGoalTitle={newGoalTitle}
                newGoalType={newGoalType}
                onCreateGoal={handleCreateGoal}
                onGeneratePlan={handleGeneratePlan}
                onGoToRecommendations={() => navigateToView("recommendations")}
                onOpenGoal={(goalId) => navigate(`/goals/${goalId}`)}
                selectedAccountRsn={selectedAccountRsn}
                selectedGoalPlan={selectedGoalPlan}
                setNewGoalTargetRsn={setNewGoalTargetRsn}
                setNewGoalTitle={setNewGoalTitle}
                setNewGoalType={setNewGoalType}
              />
            ) : null}

            {activeView === "gear" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <GearView
                busyAction={busyAction}
                gearBudgetTier={gearBudgetTier}
                gearCombatStyle={gearCombatStyle}
                gearCurrentItems={gearCurrentItems}
                gearRecommendations={gearRecommendations}
                onLoadGear={handleLoadGear}
                onOpenDetail={() => navigate("/gear/current")}
                selectedAccountRsn={selectedAccountRsn}
                setGearBudgetTier={setGearBudgetTier}
                setGearCombatStyle={setGearCombatStyle}
                setGearCurrentItems={setGearCurrentItems}
              />
            ) : null}

            {activeView === "teleports" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <TeleportsView
                busyAction={busyAction}
                onLoadTeleport={handleLoadTeleport}
                onOpenDetail={() => navigate("/teleports/current")}
                selectedAccountRsn={selectedAccountRsn}
                setTeleportDestination={setTeleportDestination}
                setTeleportPreference={setTeleportPreference}
                teleportDestination={teleportDestination}
                teleportPreference={teleportPreference}
                teleportRoute={teleportRoute}
              />
            ) : null}

            {activeView === "profile" && accountDetailId === null && goalDetailId === null && questDetailId === null && skillDetailKey === null && !gearDetailOpen && !teleportDetailOpen ? (
              <ProfileView
                accounts={accounts}
                busyAction={busyAction}
                onSaveProfile={handleSaveProfile}
                profile={profile}
                profileDraft={profileDraft}
                selectedAccountRsn={selectedAccountRsn}
                setProfileDraft={setProfileDraft}
              />
            ) : null}

        </>
      ) : null}
    </AppShell>
  );
}

function DashboardView(props: {
  accounts: Account[];
  busyAction: string | null;
  currentUser: AuthUser;
  goals: Goal[];
  nextActions: NextActionResponse | null;
  onGoToGear: () => void;
  onGoToRecommendations: () => void;
  onOpenNextAction: (action: NextAction) => void;
  onGoToGoals: () => void;
  onGoToProfile: () => void;
  onGoToQuests: () => void;
  onGoToSkills: () => void;
  onGoToTeleports: () => void;
  onCreateAccount: () => void;
  onInspectAccount: (account: Account) => void;
  onQuickstartAccount: () => void;
  onQuickstartGoal: () => void;
  onGeneratePlan: (goal: Goal) => void;
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
  selectedSnapshotDelta: {
    overallLevelDelta: number;
    combatLevelDelta: number;
    improvedSkills: Array<{ skill: string; previousLevel: number; currentLevel: number | undefined }>;
    currentSyncAt: string;
    previousSyncAt: string;
    newNinetyPlusCount: number;
  } | null;
  selectedSnapshotHistory: AccountSnapshot[];
  selectedSnapshot: AccountSnapshot | null;
  newAccountRsn: string;
  selectedAccountId: number | null;
  setProgressDraft: Dispatch<
    SetStateAction<{
      completed_quests: string;
      unlocked_transports: string;
      owned_gear: string;
      active_unlocks: string;
    }>
  >;
  setNewAccountRsn: (value: string) => void;
  workspaceChecklist: Array<{ title: string; done: boolean; detail: string }>;
  workspaceProgress: number;
}) {
  const {
    accounts,
    busyAction,
    currentUser,
    goals,
    nextActions,
    onGoToGear,
    onGoToRecommendations,
    onOpenNextAction,
    onGoToGoals,
    onGoToProfile,
    onGoToQuests,
    onGoToSkills,
    onGoToTeleports,
    onCreateAccount,
    onInspectAccount,
    onQuickstartAccount,
    onQuickstartGoal,
    onGeneratePlan,
    onSaveAccountProgress,
    onSetPrimaryAccount,
    onSyncAccount,
    profile,
    progressDraft,
    selectedAccount,
    selectedProgress,
    selectedSnapshotDelta,
    selectedSnapshotHistory,
    selectedSnapshot,
    newAccountRsn,
    selectedAccountId,
    setProgressDraft,
    setNewAccountRsn,
    workspaceChecklist,
    workspaceProgress,
  } = props;
  const primaryAccount = profile?.primary_account_rsn ?? accounts[0]?.rsn ?? null;
  const nextSetupStep =
    !profile?.display_name || !profile?.goals_focus || !profile?.play_style
      ? {
          title: "Set your planning baseline",
          detail: "Lock in your play style and focus first so every recommendation starts from the right point of view.",
          primaryLabel: "Open profile",
          primaryAction: onGoToProfile,
          secondaryLabel: null,
          secondaryAction: null,
        }
      : accounts.length === 0
        ? {
            title: "Link your first RuneScape account",
            detail: "Add an RSN and let Cerebro start building real snapshot, ranking, and planner context around it.",
            primaryLabel: "Add + sync + set primary",
            primaryAction: onQuickstartAccount,
            secondaryLabel: "Open profile",
            secondaryAction: onGoToProfile,
          }
        : !profile?.primary_account_rsn
          ? {
              title: "Choose the account this workspace revolves around",
              detail: "A primary RSN makes the rest of the product feel personal instead of generic.",
              primaryLabel: "Use first account",
              primaryAction: () => onSetPrimaryAccount(accounts[0]),
              secondaryLabel: "Review account",
              secondaryAction: () => onInspectAccount(accounts[0]),
            }
          : goals.length === 0
            ? {
                title: "Create the first real goal",
                detail: "Goals give the planner a target, which makes recommendations sharper everywhere else in the app.",
                primaryLabel: "Create first goal",
                primaryAction: onQuickstartGoal,
                secondaryLabel: "Open goals",
                secondaryAction: onGoToGoals,
              }
            : {
                title: "Your workspace is live",
                detail: "You are past basic setup. From here, the best move is to keep syncing, inspect account history, and act on the ranked recommendations.",
                primaryLabel: nextActions?.top_action ? "Open top recommendation" : "Open goals",
                primaryAction: nextActions?.top_action
                  ? () => onOpenNextAction(nextActions.top_action!)
                  : onGoToGoals,
                secondaryLabel: "Open first account",
                secondaryAction: accounts.length > 0 ? () => onInspectAccount(accounts[0]) : null,
              };
  const setupPathCards = [
    {
      title: "Baseline",
      status: workspaceChecklist[0]?.done ? "done" : "next",
      summary: "Set the play style and focus that shape recommendation tone.",
      actionLabel: "Open profile",
      action: onGoToProfile,
    },
    {
      title: "Account",
      status: workspaceChecklist[1]?.done ? "done" : "next",
      summary: accounts.length > 0
        ? `Linked ${accounts.length} account${accounts.length > 1 ? "s" : ""}.`
        : "Add your first RSN and start syncing real hiscores context.",
      actionLabel: accounts.length > 0 ? "Review account" : "Quick setup account",
      action: accounts.length > 0 ? () => onInspectAccount(accounts[0]) : onQuickstartAccount,
    },
    {
      title: "Primary",
      status: workspaceChecklist[2]?.done ? "done" : "next",
      summary: primaryAccount
        ? `${primaryAccount} is currently steering the workspace.`
        : "Choose the RSN this workspace should revolve around.",
      actionLabel: primaryAccount ? "Open profile" : "Use first account",
      action: primaryAccount || accounts.length === 0 ? onGoToProfile : () => onSetPrimaryAccount(accounts[0]),
    },
    {
      title: "Goal",
      status: workspaceChecklist[3]?.done ? "done" : "next",
      summary: goals.length > 0
        ? `Planner anchored by ${goals.length} goal${goals.length > 1 ? "s" : ""}.`
        : "Create the first goal so the recommendations stop feeling generic.",
      actionLabel: goals.length > 0 ? "Open goals" : "Create first goal",
      action: goals.length > 0 ? onGoToGoals : onQuickstartGoal,
    },
  ];

  return (
    <div className="dashboard-grid">
      <SectionCard
        title="Workspace Setup"
        subtitle={`Your planning workspace is ${workspaceProgress}/${workspaceChecklist.length} steps ready.`}
      >
        <div className="setup-progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(workspaceProgress / workspaceChecklist.length) * 100}%` }}
            />
          </div>
          <span className="muted-copy">
            Signed in as {currentUser.display_name}. Finish the basics once and the rest of the app gets much smarter.
          </span>
        </div>
        <div className="stack-list">
          {workspaceChecklist.map((item) => (
            <div className="list-row checklist-row" key={item.title}>
              <div>
                <strong>{item.done ? "Ready" : "Next"} | {item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span className={`pill ${item.done ? "pill-success" : ""}`}>
                {item.done ? "done" : "pending"}
              </span>
            </div>
          ))}
        </div>
        <div className="quick-link-row">
          <button className="tile-button compact-tile" onClick={onGoToProfile} type="button">
            <span>Open profile</span>
            <small>Set your play style, focus, and primary RSN</small>
          </button>
          <button className="tile-button compact-tile" onClick={onGoToGoals} type="button">
            <span>Open goals</span>
            <small>Turn this workspace into a real progression plan</small>
          </button>
          <button className="tile-button compact-tile" onClick={onQuickstartGoal} type="button">
            <span>Create first goal</span>
            <small>Use your current account and profile focus automatically</small>
          </button>
          <button
            className="tile-button compact-tile"
            onClick={() => onInspectAccount(accounts[0])}
            type="button"
            disabled={accounts.length === 0}
          >
            <span>Review account</span>
            <small>Jump into the first linked account and inspect it</small>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Guided Start"
        subtitle={nextSetupStep.title}
      >
        <div className="guided-start-card">
          <div>
            <p className="muted-copy">{nextSetupStep.detail}</p>
            <div className="chip-row">
              <span className="chip">Setup {workspaceProgress}/{workspaceChecklist.length}</span>
              <span className="chip">{primaryAccount ? `Primary ${primaryAccount}` : "No primary RSN yet"}</span>
            </div>
          </div>
          <div className="guided-start-actions">
            <button className="primary-button" onClick={nextSetupStep.primaryAction} type="button">
              {nextSetupStep.primaryLabel}
            </button>
            {nextSetupStep.secondaryLabel && nextSetupStep.secondaryAction ? (
              <button className="ghost-button" onClick={nextSetupStep.secondaryAction} type="button">
                {nextSetupStep.secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
        <div className="setup-path-grid">
          {setupPathCards.map((item) => (
            <div className="detail-card compact-detail" key={item.title}>
              <div className="section-split">
                <div>
                  <p className="section-label">{item.status}</p>
                  <h3>{item.title}</h3>
                </div>
                <span className={`pill ${item.status === "done" ? "pill-success" : ""}`}>
                  {item.status}
                </span>
              </div>
              <p className="muted-copy">{item.summary}</p>
              <button className="ghost-button" onClick={item.action} type="button">
                {item.actionLabel}
              </button>
            </div>
          ))}
        </div>
        {!workspaceChecklist[1]?.done ? (
          <div className="detail-card compact-detail">
            <h3>Fastest way to get moving</h3>
            <p className="muted-copy">
              Add an RSN here and Cerebro will link it, sync it, and make it the primary account in one pass.
            </p>
            <div className="inline-form">
              <input
                className="text-input"
                value={newAccountRsn}
                onChange={(event) => setNewAccountRsn(event.target.value)}
                placeholder="Enter your RSN"
              />
              <button className="primary-button" onClick={onQuickstartAccount} type="button">
                {busyAction === "quickstart-account" ? "Setting up..." : "Run quick setup"}
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Cerebro Pulse"
        subtitle="A quick read on where the account stands right now."
      >
        <div className="pulse-grid">
          <div className="detail-card">
            <h3>Top recommendation</h3>
            {nextActions?.top_action ? (
              <>
                <strong>{nextActions.top_action.title}</strong>
                <p className="muted-copy">{nextActions.top_action.summary}</p>
                <div className="chip-row">
                  <span className="chip">{nextActions.top_action.priority}</span>
                  <span className="chip">score {nextActions.top_action.score}</span>
                </div>
                <div className="inline-actions">
                  <button
                    className="ghost-button"
                    onClick={() => onOpenNextAction(nextActions.top_action!)}
                    type="button"
                  >
                    Open recommendation
                  </button>
                </div>
              </>
            ) : (
              <p className="muted-copy">No top action yet. Link an account and goal so Cerebro can rank real next moves.</p>
            )}
          </div>
          <div className="detail-card">
            <h3>Workspace owner</h3>
            <strong>{currentUser.display_name}</strong>
            <p className="muted-copy">
              {currentUser.email} | Play style: {profile?.play_style ?? "unknown"}
            </p>
          </div>
          <div className="detail-card">
            <h3>Primary account</h3>
            <strong>{profile?.primary_account_rsn ?? accounts[0]?.rsn ?? "Not set"}</strong>
            <p className="muted-copy">
              Goal focus:{" "}
              {profile?.goals_focus ?? "unknown"}
            </p>
          </div>
          <div className="detail-card">
            <h3>Snapshot signal</h3>
            {selectedSnapshot ? (
              <>
                <strong>
                  Combat {selectedSnapshot.summary.combat_level ?? "n/a"} | Overall{" "}
                  {selectedSnapshot.summary.overall_level}
                </strong>
                <p className="muted-copy">
                  Highest skill:{" "}
                  {selectedSnapshot.summary.progression_profile?.highest_skill ?? "unknown"}
                </p>
              </>
            ) : (
              <p className="muted-copy">Sync one of your accounts to see live progression signal.</p>
            )}
          </div>
        </div>
        <div className="quick-link-row">
          <button
            className="tile-button compact-tile"
            onClick={() => onGeneratePlan(goals[0])}
            type="button"
            disabled={goals.length === 0}
          >
            <span>Refresh first goal</span>
            <small>Regenerate the lead plan quickly</small>
          </button>
          <button
            className="tile-button compact-tile"
            onClick={() => onInspectAccount(accounts[0])}
            type="button"
            disabled={accounts.length === 0}
          >
            <span>Open first account</span>
            <small>Jump to the latest synced snapshot</small>
          </button>
          <button
            className="tile-button compact-tile"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            type="button"
          >
            <span>Reset view</span>
            <small>Quick jump to the top of the page</small>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Planner Surfaces"
        subtitle="Jump directly into the part of the product that matches the problem you are solving."
      >
        <div className="quick-link-row">
          <button className="tile-button compact-tile" onClick={onGoToSkills} type="button">
            <span>Skills</span>
            <small>Find the next training method for the selected account</small>
          </button>
          <button className="tile-button compact-tile" onClick={onGoToQuests} type="button">
            <span>Quests</span>
            <small>Browse unlocks and open fuller quest detail pages</small>
          </button>
          <button className="tile-button compact-tile" onClick={onGoToGear} type="button">
            <span>Gear</span>
            <small>Review upgrade ladders instead of a flat recommendation list</small>
          </button>
          <button className="tile-button compact-tile" onClick={onGoToTeleports} type="button">
            <span>Teleports</span>
            <small>Check travel routes and fallback options for destinations</small>
          </button>
          <button className="tile-button compact-tile" onClick={onGoToRecommendations} type="button">
            <span>Recommendations</span>
            <small>Open the full ranked action board for this workspace</small>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Account Bay"
        subtitle="Create and sync live OSRS accounts against the backend."
        action={
          <div className="inline-form">
            <input
              className="text-input"
              value={newAccountRsn}
              onChange={(event) => setNewAccountRsn(event.target.value)}
              placeholder="Add RSN"
            />
            <button className="primary-button" onClick={onCreateAccount} type="button">
              {busyAction === "create-account" ? "Adding..." : "Add account"}
            </button>
            <button className="ghost-button" onClick={onQuickstartAccount} type="button">
              {busyAction === "quickstart-account" ? "Setting up..." : "Add + sync + set primary"}
            </button>
          </div>
        }
      >
        <div className="stack-list">
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              body="Add your first RSN to bring the dashboard to life and unlock sync, snapshots, and planning."
              action={
                <div className="empty-action-row">
                  <button className="ghost-button" onClick={onGoToProfile} type="button">
                    Finish profile first
                  </button>
                </div>
              }
            />
          ) : null}
          {accounts.map((account) => (
            <div className="list-row" key={account.id}>
              <div>
                <strong>{account.rsn}</strong>
                <p>
                  {account.is_active ? "Active account" : "Inactive account"}
                  {selectedAccountId === account.id ? " | viewing snapshot" : ""}
                  {profile?.primary_account_rsn === account.rsn ? " | primary account" : ""}
                </p>
              </div>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  onClick={() => onInspectAccount(account)}
                  type="button"
                >
                  {busyAction === `inspect-${account.id}` ? "Opening..." : "View"}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => onSyncAccount(account)}
                  type="button"
                >
                  {busyAction === `sync-${account.id}` ? "Syncing..." : "Sync"}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => onSetPrimaryAccount(account)}
                  type="button"
                >
                  {busyAction === `primary-${account.id}` ? "Saving..." : "Set primary"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Next Actions"
        subtitle="Ranked directly from the recommendation engine."
      >
        <div className="action-stack">
          {nextActions ? (
            nextActions.actions.map((action, index) => (
              <div
                className={`list-row action-row${index === 0 ? " spotlight-row" : ""}`}
                key={`${action.action_type}-${action.title}`}
              >
                <div>
                  <strong>
                    {index === 0 ? "Priority" : "Queued"} | {action.title}
                  </strong>
                  <p>{action.summary}</p>
                  {action.blockers.length > 0 ? (
                    <small className="muted-copy">
                      Blockers: {action.blockers.join(", ")}
                    </small>
                  ) : null}
                </div>
                <div className="inline-actions">
                  <button
                    className="ghost-button"
                    onClick={() => onOpenNextAction(action)}
                    type="button"
                  >
                    Open
                  </button>
                  <div className="score-pill">{action.score}</div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No ranked actions yet"
              body="Create an account or goal to give the recommendation engine more context."
              action={
                <div className="empty-action-row">
                  <button className="ghost-button" onClick={onQuickstartGoal} type="button">
                    Create a suggested goal
                  </button>
                </div>
              }
            />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Live Snapshot"
        subtitle="Latest synced account profile from enriched OSRS ingestion."
      >
        {selectedSnapshot ? (
          <div className="snapshot-grid">
            <Metric label="Overall" value={selectedSnapshot.summary.overall_level} />
            <Metric label="Combat" value={selectedSnapshot.summary.combat_level ?? "n/a"} />
            <Metric
              label="99s"
              value={selectedSnapshot.summary.progression_profile?.total_skills_at_99 ?? "n/a"}
            />
            <Metric
              label="Tracked Activities"
              value={selectedSnapshot.summary.activity_overview?.tracked_activity_count ?? "n/a"}
            />
            <div className="detail-card">
              <h3>Sync details</h3>
              <strong>{formatTimestamp(selectedSnapshot.created_at)}</strong>
              <p className="muted-copy">
                Source: {selectedSnapshot.source} | Status: {selectedSnapshot.sync_status}
              </p>
            </div>
            <div className="detail-card">
              <h3>Activity signal</h3>
              <strong>
                {selectedSnapshot.summary.activity_overview?.active_activity_count ?? 0} active rows
              </strong>
              <p className="muted-copy">
                Top skills tracked: {selectedSnapshot.summary.top_skills?.length ?? 0} | 90+ skills:{" "}
                {selectedSnapshot.summary.progression_profile?.total_skills_at_90_plus ?? 0}
              </p>
            </div>
            <div className="detail-card wide-card">
              <div className="snapshot-header">
                <div>
                  <h3>Top skills</h3>
                  <p className="muted-copy">
                    Lowest tracked skill:{" "}
                    {selectedSnapshot.summary.progression_profile?.lowest_tracked_skill ?? "unknown"}
                  </p>
                </div>
                <span className="pill">{selectedSnapshot.summary.rsn}</span>
              </div>
              <div className="skill-pill-grid">
                {selectedSnapshot.summary.top_skills?.map((skill) => (
                  <div className="skill-pill" key={skill.skill}>
                    <strong>{skill.skill}</strong>
                    <span>Lvl {skill.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No snapshot loaded"
            body="Pick an account and run a sync to see combat level, top skills, and activity signals."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Since Last Sync"
        subtitle="A quick read on what changed between the two most recent snapshots."
      >
        {selectedSnapshotDelta ? (
          <div className="snapshot-change-grid">
            <Metric
              label="Overall Delta"
              value={selectedSnapshotDelta.overallLevelDelta >= 0
                ? `+${selectedSnapshotDelta.overallLevelDelta}`
                : selectedSnapshotDelta.overallLevelDelta}
            />
            <Metric
              label="Combat Delta"
              value={selectedSnapshotDelta.combatLevelDelta >= 0
                ? `+${selectedSnapshotDelta.combatLevelDelta}`
                : selectedSnapshotDelta.combatLevelDelta}
            />
            <Metric
              label="Skills Improved"
              value={selectedSnapshotDelta.improvedSkills.length}
            />
            <Metric
              label="New 90+ Skills"
              value={selectedSnapshotDelta.newNinetyPlusCount >= 0
                ? `+${selectedSnapshotDelta.newNinetyPlusCount}`
                : selectedSnapshotDelta.newNinetyPlusCount}
            />
            <div className="detail-card">
              <h3>Sync window</h3>
              <strong>{formatTimestamp(selectedSnapshotDelta.currentSyncAt)}</strong>
              <p className="muted-copy">
                Compared against {formatTimestamp(selectedSnapshotDelta.previousSyncAt)}
              </p>
            </div>
            <div className="detail-card">
              <h3>Momentum read</h3>
              <strong>
                {selectedSnapshotDelta.improvedSkills.length > 0 || selectedSnapshotDelta.overallLevelDelta > 0
                  ? "Progress detected"
                  : "Little visible movement"}
              </strong>
              <p className="muted-copy">
                {selectedSnapshotDelta.improvedSkills.length > 0
                  ? "The account is moving forward between syncs instead of sitting on the same profile."
                  : "Try syncing again after a play session to give Cerebro real momentum to work with."}
              </p>
            </div>
            <div className="detail-card wide-card">
              <h3>Improved tracked skills</h3>
              {selectedSnapshotDelta.improvedSkills.length > 0 ? (
                <div className="chip-row">
                  {selectedSnapshotDelta.improvedSkills.map((skill) => (
                    <span className="chip" key={skill.skill}>
                      {skill.skill} {skill.previousLevel}{"->"}{skill.currentLevel}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">
                  No top-skill movement was visible between the most recent two snapshots.
                </p>
              )}
            </div>
            {selectedSnapshotHistory.length > 0 ? (
              <div className="detail-card wide-card">
                <h3>Recent sync timeline</h3>
                <div className="stack-list">
                  {selectedSnapshotHistory.map((snapshot, index) => (
                    <div className="list-row" key={snapshot.id}>
                      <div>
                        <strong>{index === 0 ? "Latest" : "Previous"} | {formatTimestamp(snapshot.created_at)}</strong>
                        <p>
                          Overall {snapshot.summary.overall_level} | Combat {snapshot.summary.combat_level ?? "n/a"}
                        </p>
                      </div>
                      <span className="pill">{snapshot.sync_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Not enough sync history yet"
            body="Run at least two syncs on the selected account and Cerebro will show what changed between them."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Account Workspace"
        subtitle={
          selectedAccount
            ? `Track quest progress, travel unlocks, and owned gear for ${selectedAccount.rsn}.`
            : "Pick an account to track the manual context hiscores cannot tell us."
        }
      >
        {selectedAccount ? (
          <div className="account-workspace-grid">
            <div className="detail-card">
              <h3>Workspace status</h3>
              <strong>{selectedAccount.rsn}</strong>
              <p className="muted-copy">
                {profile?.primary_account_rsn === selectedAccount.rsn ? "Primary account" : "Linked account"}
                {" | "}
                {selectedSnapshot ? `Last sync ${formatTimestamp(selectedSnapshot.created_at)}` : "No sync yet"}
              </p>
              <div className="chip-row">
                <span className="chip">
                  {selectedProgress?.completed_quests.length ?? 0} quests tracked
                </span>
                <span className="chip">
                  {selectedProgress?.unlocked_transports.length ?? 0} transports
                </span>
                <span className="chip">
                  {selectedProgress?.owned_gear.length ?? 0} gear notes
                </span>
                <span className="chip">
                  {selectedProgress?.active_unlocks.length ?? 0} unlock chains
                </span>
              </div>
            </div>

            <div className="detail-card">
              <h3>Completed quests</h3>
              <p className="muted-copy">
                One per line. Use this to stop the planner from treating finished quest unlocks as missing.
              </p>
              <textarea
                className="text-area"
                value={progressDraft.completed_quests}
                onChange={(event) =>
                  setProgressDraft((current) => ({
                    ...current,
                    completed_quests: event.target.value,
                  }))
                }
                placeholder={"bone voyage\nwaterfall quest"}
              />
              <div className="chip-row suggestion-row">
                {ACCOUNT_PROGRESS_SUGGESTIONS.completed_quests.map((entry) => (
                  <button
                    key={entry}
                    className="chip-button"
                    onClick={() =>
                      setProgressDraft((current) => ({
                        ...current,
                        completed_quests: appendListDraft(current.completed_quests, entry),
                      }))
                    }
                    type="button"
                  >
                    + {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-card">
              <h3>Unlocked transports</h3>
              <p className="muted-copy">
                Travel systems like digsite pendant, fairy rings, or museum kudos-based routes belong here.
              </p>
              <textarea
                className="text-area"
                value={progressDraft.unlocked_transports}
                onChange={(event) =>
                  setProgressDraft((current) => ({
                    ...current,
                    unlocked_transports: event.target.value,
                  }))
                }
                placeholder={"digsite pendant\n100 museum kudos"}
              />
              <div className="chip-row suggestion-row">
                {ACCOUNT_PROGRESS_SUGGESTIONS.unlocked_transports.map((entry) => (
                  <button
                    key={entry}
                    className="chip-button"
                    onClick={() =>
                      setProgressDraft((current) => ({
                        ...current,
                        unlocked_transports: appendListDraft(current.unlocked_transports, entry),
                      }))
                    }
                    type="button"
                  >
                    + {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-card">
              <h3>Owned gear</h3>
              <p className="muted-copy">
                Keep upgrade suggestions honest by listing the pieces this account already owns.
              </p>
              <textarea
                className="text-area"
                value={progressDraft.owned_gear}
                onChange={(event) =>
                  setProgressDraft((current) => ({
                    ...current,
                    owned_gear: event.target.value,
                  }))
                }
                placeholder={"ahrim's robes\ntoxic trident"}
              />
              <div className="chip-row suggestion-row">
                {ACCOUNT_PROGRESS_SUGGESTIONS.owned_gear.map((entry) => (
                  <button
                    key={entry}
                    className="chip-button"
                    onClick={() =>
                      setProgressDraft((current) => ({
                        ...current,
                        owned_gear: appendListDraft(current.owned_gear, entry),
                      }))
                    }
                    type="button"
                  >
                    + {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-card">
              <h3>Active unlock chains</h3>
              <p className="muted-copy">
                Capture the account's current push so recommendations can respect momentum instead of starting cold.
              </p>
              <textarea
                className="text-area"
                value={progressDraft.active_unlocks}
                onChange={(event) =>
                  setProgressDraft((current) => ({
                    ...current,
                    active_unlocks: event.target.value,
                  }))
                }
                placeholder={"quest cape\nbarrows gloves"}
              />
              <div className="chip-row suggestion-row">
                {ACCOUNT_PROGRESS_SUGGESTIONS.active_unlocks.map((entry) => (
                  <button
                    key={entry}
                    className="chip-button"
                    onClick={() =>
                      setProgressDraft((current) => ({
                        ...current,
                        active_unlocks: appendListDraft(current.active_unlocks, entry),
                      }))
                    }
                    type="button"
                  >
                    + {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-card wide-card">
              <div className="section-split">
                <div>
                  <h3>Save planning context</h3>
                  <p className="muted-copy">
                    This is the human layer on top of hiscores: the unlocks, completions, and gear state Cerebro should remember.
                  </p>
                </div>
                <button className="primary-button" onClick={onSaveAccountProgress} type="button">
                  {busyAction === "account-progress" ? "Saving..." : "Save account workspace"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No account selected"
            body="Choose one of your linked RSNs from the sidebar or account bay, then use this workspace to track quests, transports, gear, and progression chains."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Goal Radar"
        subtitle={`Play style: ${profile?.play_style ?? "unknown"}`}
      >
        <div className="stack-list">
          {goals.length === 0 ? (
            <EmptyState
              title="No goals yet"
              body="Create a goal to start generating plans and connect the dashboard to a real target."
              action={
                <div className="empty-action-row">
                  <button className="ghost-button" onClick={onQuickstartGoal} type="button">
                    Create a suggested goal
                  </button>
                  <button className="ghost-button" onClick={onGoToGoals} type="button">
                    Open goal builder
                  </button>
                </div>
              }
            />
          ) : null}
          {goals.slice(0, 4).map((goal) => (
            <div className="list-row" key={goal.id}>
              <div>
                <strong>{goal.title}</strong>
                <p>
                  {goal.goal_type}
                  {goal.generated_plan ? " | plan ready" : " | plan not generated yet"}
                </p>
              </div>
              <button
                className="ghost-button"
                onClick={() => onGeneratePlan(goal)}
                type="button"
              >
                {busyAction === `plan-${goal.id}` ? "Generating..." : "Plan"}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AccountDetailView(props: {
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
}) {
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
      <SectionCard
        title="Account Detail"
        subtitle="Pick a linked account to open its full planning workspace."
      >
        <EmptyState
          title="No account loaded"
          body="Select an account from the sidebar or dashboard to inspect its sync history, progress tracking, and account-specific goals."
        />
      </SectionCard>
    );
  }

  const accountActionMatches = nextActions?.actions.filter(
    (action) => (action.target.account_rsn as string | undefined | null) === selectedAccount.rsn,
  ) ?? [];
  const snapshotTrend = buildSnapshotTrend(selectedSnapshotHistory);

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onBackToDashboard },
          { label: "Accounts", onClick: onBackToDashboard },
          { label: selectedAccount.rsn },
        ]}
      />
      <SectionCard
        title="Account Detail"
        subtitle={`Deep workspace view for ${selectedAccount.rsn}.`}
        action={
          <div className="inline-actions">
            <button
              className="ghost-button"
              onClick={() => onSetPrimaryAccount(selectedAccount)}
              type="button"
            >
              {busyAction === `primary-${selectedAccount.id}` ? "Saving..." : "Set primary"}
            </button>
            <button
              className="primary-button"
              onClick={() => onSyncAccount(selectedAccount)}
              type="button"
            >
              {busyAction === `sync-${selectedAccount.id}` ? "Syncing..." : "Sync now"}
            </button>
          </div>
        }
      >
        <div className="detail-page-hero">
          <div className="detail-card">
            <h3>Workspace status</h3>
            <strong>{selectedAccount.rsn}</strong>
            <p className="muted-copy">
              {profile?.primary_account_rsn === selectedAccount.rsn ? "Primary account" : "Linked account"}
              {" | "}
              {selectedSnapshot ? `Last sync ${formatTimestamp(selectedSnapshot.created_at)}` : "No sync yet"}
            </p>
            <div className="chip-row">
              <span className="chip">Goals {accountGoals.length}</span>
              <span className="chip">Quests {selectedProgress?.completed_quests.length ?? 0}</span>
              <span className="chip">Unlocks {selectedProgress?.active_unlocks.length ?? 0}</span>
            </div>
          </div>
          <div className="detail-card">
            <h3>Current power read</h3>
            <strong>
              Overall {selectedSnapshot?.summary.overall_level ?? "n/a"} | Combat {selectedSnapshot?.summary.combat_level ?? "n/a"}
            </strong>
            <p className="muted-copy">
              Highest tracked skill: {selectedSnapshot?.summary.progression_profile?.highest_skill ?? "unknown"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Sync History"
        subtitle="Recent progression movement and sync timeline for this account."
      >
        {selectedSnapshotDelta || snapshotTrend ? (
          <div className="snapshot-change-grid">
            <Metric
              label="Overall Delta"
              value={selectedSnapshotDelta
                ? selectedSnapshotDelta.overallLevelDelta >= 0
                  ? `+${selectedSnapshotDelta.overallLevelDelta}`
                  : selectedSnapshotDelta.overallLevelDelta
                : "n/a"}
            />
            <Metric
              label="Combat Delta"
              value={selectedSnapshotDelta
                ? selectedSnapshotDelta.combatLevelDelta >= 0
                  ? `+${selectedSnapshotDelta.combatLevelDelta}`
                  : selectedSnapshotDelta.combatLevelDelta
                : "n/a"}
            />
            <Metric
              label="Skills Improved"
              value={selectedSnapshotDelta ? selectedSnapshotDelta.improvedSkills.length : 0}
            />
            <Metric
              label="New 90+ Skills"
              value={selectedSnapshotDelta
                ? selectedSnapshotDelta.newNinetyPlusCount >= 0
                  ? `+${selectedSnapshotDelta.newNinetyPlusCount}`
                  : selectedSnapshotDelta.newNinetyPlusCount
                : "n/a"}
            />
            <div className="detail-card wide-card">
              <h3>Trend read</h3>
              {snapshotTrend ? (
                <div className="trend-grid">
                  <div className="detail-card compact-detail">
                    <strong>{snapshotTrend.syncCount} synced checkpoints</strong>
                    <p className="muted-copy">
                      Net overall {snapshotTrend.overallGain >= 0 ? "+" : ""}
                      {snapshotTrend.overallGain} since {formatTimestamp(snapshotTrend.oldest.created_at)}
                    </p>
                    <p className="muted-copy">
                      Combat {snapshotTrend.combatGain >= 0 ? "+" : ""}
                      {snapshotTrend.combatGain} across the same window.
                    </p>
                  </div>
                  <div className="detail-card compact-detail">
                    <strong>
                      {snapshotTrend.topSkillMovers.length > 0 ? "Momentum is showing up" : "Still building history"}
                    </strong>
                    <p className="muted-copy">
                      {snapshotTrend.topSkillMovers.length > 0
                        ? `Most visible movement: ${snapshotTrend.topSkillMovers
                          .map((skill) => `${skill.skill} +${skill.delta}`)
                          .join(", ")}.`
                        : "More syncs will turn this into a clearer progression read instead of a single snapshot."}
                    </p>
                  </div>
                  <div className="detail-card wide-card">
                    <h3>Overall and combat trend</h3>
                    <div className="trend-list">
                      {snapshotTrend.points.map((point) => (
                        <div className="trend-row" key={point.id}>
                          <div className="trend-meta">
                            <strong>{point.label}</strong>
                            <span>{formatTimestamp(point.createdAt)}</span>
                          </div>
                          <div className="trend-bars">
                            <div className="trend-bar-group">
                              <span>Overall {point.overall}</span>
                              <div className="trend-bar-track">
                                <div
                                  className="trend-bar-fill overall"
                                  style={{ width: `${point.overallPercent}%` }}
                                />
                              </div>
                            </div>
                            <div className="trend-bar-group">
                              <span>Combat {point.combat}</span>
                              <div className="trend-bar-track">
                                <div
                                  className="trend-bar-fill combat"
                                  style={{ width: `${point.combatPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <span className="pill">{point.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {snapshotTrend.topSkillMovers.length > 0 ? (
                    <div className="detail-card wide-card">
                      <h3>Top skill movers</h3>
                      <div className="chip-row">
                        {snapshotTrend.topSkillMovers.map((skill) => (
                          <span className="chip" key={skill.skill}>
                            {skill.skill} +{skill.delta}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {selectedSnapshotDelta ? (
              <>
                <div className="detail-card">
                  <h3>Sync window</h3>
                  <strong>{formatTimestamp(selectedSnapshotDelta.currentSyncAt)}</strong>
                  <p className="muted-copy">
                    Compared against {formatTimestamp(selectedSnapshotDelta.previousSyncAt)}
                  </p>
                </div>
                <div className="detail-card">
                  <h3>Momentum read</h3>
                  <strong>
                    {selectedSnapshotDelta.improvedSkills.length > 0 || selectedSnapshotDelta.overallLevelDelta > 0
                      ? "Progress detected"
                      : "Little visible movement"}
                  </strong>
                  <p className="muted-copy">
                    {selectedSnapshotDelta.improvedSkills.length > 0
                      ? "The account is moving forward between syncs instead of sitting on the same profile."
                      : "Try syncing again after a play session to give Cerebro real momentum to work with."}
                  </p>
                </div>
                <div className="detail-card wide-card">
                  <h3>Improved tracked skills</h3>
                  {selectedSnapshotDelta.improvedSkills.length > 0 ? (
                    <div className="chip-row">
                      {selectedSnapshotDelta.improvedSkills.map((skill) => (
                        <span className="chip" key={skill.skill}>
                          {skill.skill} {skill.previousLevel}{"->"}{skill.currentLevel}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">
                      No top-skill movement was visible between the most recent two snapshots.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="No sync comparison yet"
            body="Run this account through sync at least twice and Cerebro will start showing movement over time here."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Planning Context"
        subtitle="Manual progress, unlocks, and owned gear that the planner should remember."
        action={
          <button className="primary-button" onClick={onSaveAccountProgress} type="button">
            {busyAction === "account-progress" ? "Saving..." : "Save account workspace"}
          </button>
        }
      >
        <div className="account-workspace-grid">
          <div className="detail-card">
            <h3>Completed quests</h3>
            <textarea
              className="text-area"
              value={progressDraft.completed_quests}
              onChange={(event) =>
                setProgressDraft((current) => ({
                  ...current,
                  completed_quests: event.target.value,
                }))
              }
              placeholder={"bone voyage\nwaterfall quest"}
            />
          </div>
          <div className="detail-card">
            <h3>Unlocked transports</h3>
            <textarea
              className="text-area"
              value={progressDraft.unlocked_transports}
              onChange={(event) =>
                setProgressDraft((current) => ({
                  ...current,
                  unlocked_transports: event.target.value,
                }))
              }
              placeholder={"digsite pendant\nfairy rings"}
            />
          </div>
          <div className="detail-card">
            <h3>Owned gear</h3>
            <textarea
              className="text-area"
              value={progressDraft.owned_gear}
              onChange={(event) =>
                setProgressDraft((current) => ({
                  ...current,
                  owned_gear: event.target.value,
                }))
              }
              placeholder={"ahrim's robes\ntoxic trident"}
            />
          </div>
          <div className="detail-card">
            <h3>Active unlock chains</h3>
            <textarea
              className="text-area"
              value={progressDraft.active_unlocks}
              onChange={(event) =>
                setProgressDraft((current) => ({
                  ...current,
                  active_unlocks: event.target.value,
                }))
              }
              placeholder={"quest cape\nbarrows gloves"}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Account Goals"
        subtitle="Goal plans and ranked actions that currently point at this account."
        action={
          <button className="ghost-button" onClick={onGoToGoals} type="button">
            Open goals
          </button>
        }
      >
        <div className="stack-list">
          {accountGoals.length > 0 ? (
            accountGoals.map((goal) => (
              <div className="list-row" key={goal.id}>
                <div>
                  <strong>{goal.title}</strong>
                  <p>{goal.goal_type}</p>
                </div>
                <button className="ghost-button" onClick={() => onGeneratePlan(goal)} type="button">
                  {busyAction === `plan-${goal.id}` ? "Generating..." : "Generate plan"}
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              title="No goals tied to this account"
              body="Create a goal with this RSN as the target and it will start showing up here."
            />
          )}
          {accountActionMatches.length > 0 ? (
            <div className="detail-card">
              <h3>Account-specific next actions</h3>
              <div className="stack-list">
                {accountActionMatches.slice(0, 3).map((action) => (
                  <div className="detail-row" key={`${action.action_type}-${action.title}`}>
                    <strong>{action.title}</strong>
                    <p>{action.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

function GoalDetailView(props: {
  busyAction: string | null;
  nextActions: NextActionResponse | null;
  onBackToDashboard: () => void;
  onGeneratePlan: (goal: Goal) => void;
  onGoToGoals: () => void;
  onOpenNextAction: (action: NextAction) => void;
  onOpenRecommendedQuest: (questId: string) => void;
  onOpenTargetAccount: (rsn: string) => void;
  profile: Profile | null;
  selectedGoal: Goal | null;
  selectedGoalPlan: GoalPlanResponse | null;
}) {
  const {
    busyAction,
    nextActions,
    onBackToDashboard,
    onGeneratePlan,
    onGoToGoals,
    onOpenNextAction,
    onOpenRecommendedQuest,
    onOpenTargetAccount,
    profile,
    selectedGoal,
    selectedGoalPlan,
  } = props;

  if (!selectedGoal) {
    return (
      <SectionCard
        title="Goal Detail"
        subtitle="Pick a goal to open its full planning view."
      >
        <EmptyState
          title="No goal loaded"
          body="Open a goal from the goals page or generate a plan for one of your goals to inspect it here."
        />
      </SectionCard>
    );
  }

  const matchedActions = nextActions?.actions.filter((action) => {
    const targetGoalId = action.target.goal_id;
    return typeof targetGoalId === "number" && targetGoalId === selectedGoal.id;
  }) ?? [];
  const planRecommendations =
    selectedGoalPlan && selectedGoalPlan.goal_id === selectedGoal.id
      ? selectedGoalPlan.recommendations
      : null;
  const recommendedSkill =
    typeof planRecommendations?.["recommended_skill"] === "string"
      ? (planRecommendations["recommended_skill"] as string)
      : null;
  const recommendedQuest =
    typeof planRecommendations?.["recommended_quest"] === "string"
      ? (planRecommendations["recommended_quest"] as string)
      : null;
  const recommendedGear =
    typeof planRecommendations?.["recommended_gear"] === "string"
      ? (planRecommendations["recommended_gear"] as string)
      : null;
  const recommendedTeleport =
    typeof planRecommendations?.["recommended_teleport"] === "string"
      ? (planRecommendations["recommended_teleport"] as string)
      : null;
  const extraRecommendationEntries = planRecommendations
    ? Object.entries(planRecommendations).filter(
        ([key]) =>
          !["recommended_skill", "recommended_quest", "recommended_gear", "recommended_teleport"].includes(key),
      )
    : [];

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onBackToDashboard },
          { label: "Goals", onClick: onGoToGoals },
          { label: selectedGoal.title },
        ]}
      />
      <SectionCard
        title="Goal Detail"
        subtitle={`Full planning view for ${selectedGoal.title}.`}
        action={
          <div className="inline-actions">
            <button className="ghost-button" onClick={onGoToGoals} type="button">
              All goals
            </button>
            <button
              className="primary-button"
              onClick={() => onGeneratePlan(selectedGoal)}
              type="button"
            >
              {busyAction === `plan-${selectedGoal.id}` ? "Generating..." : "Refresh plan"}
            </button>
          </div>
        }
      >
        <div className="detail-page-hero">
          <div className="detail-card">
            <h3>Goal status</h3>
            <strong>{selectedGoal.title}</strong>
            <p className="muted-copy">
              {selectedGoal.goal_type} | {selectedGoal.status}
              {selectedGoal.target_account_rsn ? ` | target ${selectedGoal.target_account_rsn}` : ""}
            </p>
            <div className="chip-row">
              <span className="chip">{profile?.goals_focus ?? "progression"}</span>
              <span className="chip">
                {selectedGoal.generated_plan ? "plan ready" : "plan not generated"}
              </span>
            </div>
          </div>
          <div className="detail-card">
            <h3>Planning notes</h3>
            <strong>{selectedGoal.notes ?? "No notes yet"}</strong>
            <p className="muted-copy">
              This page is where richer guided content, videos, and walkthroughs can live later without crowding the rest of the app.
            </p>
          </div>
        </div>
      </SectionCard>

      {selectedGoalPlan && selectedGoalPlan.goal_id === selectedGoal.id ? (
        <SectionCard
          title="Generated Plan"
          subtitle={selectedGoalPlan.summary}
        >
          <div className="plan-columns">
            <div className="detail-card">
              <h3>Steps</h3>
              <ol className="plan-list">
                {selectedGoalPlan.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div className="detail-card">
              <h3>Recommendation Snapshot</h3>
              <div className="recommendation-grid">
                {recommendedSkill ? (
                  <div className="detail-row compact-detail">
                    <strong>Recommended skill</strong>
                    <p className="muted-copy">{recommendedSkill}</p>
                  </div>
                ) : null}
                {recommendedQuest ? (
                  <div className="detail-row compact-detail">
                    <strong>Recommended quest</strong>
                    <p className="muted-copy">{recommendedQuest}</p>
                    <div className="inline-actions">
                      <button
                        className="ghost-button"
                        onClick={() => onOpenRecommendedQuest(recommendedQuest)}
                        type="button"
                      >
                        Open quest page
                      </button>
                    </div>
                  </div>
                ) : null}
                {recommendedGear ? (
                  <div className="detail-row compact-detail">
                    <strong>Recommended gear</strong>
                    <p className="muted-copy">{recommendedGear}</p>
                  </div>
                ) : null}
                {recommendedTeleport ? (
                  <div className="detail-row compact-detail">
                    <strong>Recommended route</strong>
                    <p className="muted-copy">{recommendedTeleport}</p>
                  </div>
                ) : null}
                {extraRecommendationEntries.map(([key, value]) => (
                  <div className="detail-row compact-detail" key={key}>
                    <strong>{key.replaceAll("_", " ")}</strong>
                    <pre className="code-block compact-code">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-card wide-card">
              <h3>Plan context</h3>
              <div className="tile-grid">
                {selectedGoal.target_account_rsn ? (
                  <button
                    className="tile-button compact-tile"
                    onClick={() => onOpenTargetAccount(selectedGoal.target_account_rsn!)}
                    type="button"
                  >
                    <span>Open target account</span>
                    <small>{selectedGoal.target_account_rsn}</small>
                  </button>
                ) : null}
                <div className="detail-row compact-detail compact-tile">
                  <strong>Planner context</strong>
                  <pre className="code-block compact-code">
                    {JSON.stringify(selectedGoalPlan.context, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Generated Plan"
          subtitle="No generated plan is loaded for this goal yet."
        >
          <EmptyState
            title="No plan loaded"
            body="Generate or refresh the goal plan to inspect the steps, recommendation payload, and supporting context."
          />
        </SectionCard>
      )}

      <SectionCard
        title="Goal-Aware Actions"
        subtitle="The ranked actions currently most relevant to this goal."
      >
        {matchedActions.length > 0 ? (
              <div className="stack-list">
                {matchedActions.map((action) => (
                  <div className="list-row action-row" key={`${action.action_type}-${action.title}`}>
                    <div>
                      <strong>{action.title}</strong>
                      <p>{action.summary}</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        className="ghost-button"
                        onClick={() => onOpenNextAction(action)}
                        type="button"
                      >
                        Open
                      </button>
                      <div className="score-pill">{action.score}</div>
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          <EmptyState
            title="No goal-specific actions yet"
            body="Generate a plan for this goal and Cerebro will start surfacing more targeted next actions here."
          />
        )}
      </SectionCard>
    </div>
  );
}

function QuestDetailPage(props: {
  onBackToDashboard: () => void;
  onBackToQuests: () => void;
  onOpenNextAction: (action: NextAction) => void;
  nextActions: NextActionResponse | null;
  selectedQuest: QuestDetail | null;
}) {
  const { onBackToDashboard, onBackToQuests, onOpenNextAction, nextActions, selectedQuest } = props;

  if (!selectedQuest) {
    return (
      <SectionCard
        title="Quest Detail"
        subtitle="Pick a quest to open its full unlock page."
      >
        <EmptyState
          title="No quest loaded"
          body="Open a quest from the quest catalog to inspect requirements, rewards, and follow-up steps here."
        />
      </SectionCard>
    );
  }

  const relatedActions = nextActions?.actions.filter((action) => {
    const questId = action.target.quest_id;
    return action.action_type === "quest" && typeof questId === "string" && questId === selectedQuest.id;
  }) ?? [];

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onBackToDashboard },
          { label: "Quests", onClick: onBackToQuests },
          { label: selectedQuest.name },
        ]}
      />
      <SectionCard
        title="Quest Detail"
        subtitle={selectedQuest.name}
        action={
          <button className="ghost-button" onClick={onBackToQuests} type="button">
            All quests
          </button>
        }
      >
        <div className="detail-page-hero">
          <div className="detail-card">
            <h3>Quest overview</h3>
            <strong>{selectedQuest.name}</strong>
            <p className="muted-copy">
              {selectedQuest.difficulty} | {selectedQuest.category}
            </p>
          </div>
          <div className="detail-card">
            <h3>Why it matters</h3>
            <strong>{selectedQuest.short_description}</strong>
            <p className="muted-copy">{selectedQuest.why_it_matters}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Requirements and Rewards"
        subtitle="What the quest asks for and what it unlocks in return."
      >
        <div className="plan-columns">
          <div className="detail-card">
            <h3>Requirements</h3>
            <ul className="plan-list unordered-list">
              {selectedQuest.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="detail-card">
            <h3>Rewards</h3>
            <ul className="plan-list unordered-list">
              {selectedQuest.rewards.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Next Steps"
        subtitle="A cleaner place for walkthrough-style guidance and richer content later."
      >
        <div className="detail-card">
          <ol className="plan-list">
            {selectedQuest.next_steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </SectionCard>

      <SectionCard
        title="Quest Links"
        subtitle="Use this page as a launch point back into the planner."
      >
        {relatedActions.length > 0 ? (
          <div className="stack-list">
            {relatedActions.map((action) => (
              <div className="list-row action-row" key={`${action.action_type}-${action.title}`}>
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.summary}</p>
                  {action.blockers.length > 0 ? (
                    <small className="muted-copy">
                      Blockers: {action.blockers.join(", ")}
                    </small>
                  ) : null}
                </div>
                <div className="inline-actions">
                  <button
                    className="ghost-button"
                    onClick={() => onOpenNextAction(action)}
                    type="button"
                  >
                    Open from recommendations
                  </button>
                  <div className="score-pill">{action.score}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active recommendation card for this quest"
            body="Once this quest becomes part of your ranked next actions, it will show up here with a direct route back into the planner."
          />
        )}
      </SectionCard>
    </div>
  );
}

function SkillDetailPage(props: {
  onBackToDashboard: () => void;
  onBackToSkills: () => void;
  onReloadSkill: (skillKey: string) => void;
  selectedAccountRsn: string | null;
  skillRecommendations: SkillRecommendationResponse | null;
}) {
  const {
    onBackToDashboard,
    onBackToSkills,
    onReloadSkill,
    selectedAccountRsn,
    skillRecommendations,
  } = props;

  if (!skillRecommendations) {
    return (
      <SectionCard
        title="Skill Detail"
        subtitle="Open a skill to inspect its current training path."
      >
        <EmptyState
          title="No skill loaded"
          body="Choose a skill from the skills catalog or from a recommendation card to inspect the live training methods here."
        />
      </SectionCard>
    );
  }

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onBackToDashboard },
          { label: "Skills", onClick: onBackToSkills },
          { label: skillRecommendations.skill },
        ]}
      />
      <SectionCard
        title="Skill Detail"
        subtitle={skillRecommendations.skill}
        action={
          <div className="inline-actions">
            <button className="ghost-button" onClick={onBackToSkills} type="button">
              All skills
            </button>
            <button
              className="primary-button"
              onClick={() => onReloadSkill(skillRecommendations.skill)}
              type="button"
            >
              Refresh skill
            </button>
          </div>
        }
      >
        <div className="detail-page-hero">
          <div className="detail-card">
            <h3>Current read</h3>
            <strong>{skillRecommendations.skill}</strong>
            <p className="muted-copy">
              Account: {selectedAccountRsn ?? "none selected"} | Preference: {skillRecommendations.preference}
            </p>
            <div className="chip-row">
              <span className="chip">
                Current level {skillRecommendations.current_level ?? "unknown"}
              </span>
              <span className="chip">
                Methods {skillRecommendations.recommendations.length}
              </span>
            </div>
          </div>
          <div className="detail-card">
            <h3>Why this page exists</h3>
            <strong>Training guidance belongs on its own screen.</strong>
            <p className="muted-copy">
              This gives us room for better method breakdowns, routes, video guides, and account-specific coaching later without crowding the catalog.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Recommended Methods"
        subtitle="Live methods from the backend recommendation layer."
      >
        <div className="stack-list">
          {skillRecommendations.recommendations.map((recommendation) => (
            <div className="detail-card" key={recommendation.method}>
              <div className="list-row">
                <div>
                  <strong>{recommendation.method}</strong>
                  <p>{recommendation.rationale}</p>
                </div>
                <span className="pill">{recommendation.estimated_xp_rate}</span>
              </div>
              <div className="chip-row">
                <span className="chip">
                  Levels {recommendation.min_level}-{recommendation.max_level}
                </span>
                <span className="chip">{recommendation.preference}</span>
                {recommendation.tags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              {recommendation.requirements.length > 0 ? (
                <div className="detail-row compact-detail">
                  <strong>Requirements</strong>
                  <ul className="plan-list unordered-list">
                    {recommendation.requirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function GearDetailPage(props: {
  gearRecommendations: GearRecommendationResponse | null;
  onBackToDashboard: () => void;
  onBackToGear: () => void;
  onReloadGear: () => void;
  selectedAccountRsn: string | null;
}) {
  const {
    gearRecommendations,
    onBackToDashboard,
    onBackToGear,
    onReloadGear,
    selectedAccountRsn,
  } = props;

  if (!gearRecommendations) {
    return (
      <SectionCard
        title="Gear Detail"
        subtitle="Open a gear loadout to inspect upgrade paths."
      >
        <EmptyState
          title="No gear recommendation loaded"
          body="Run a gear recommendation from the gear page and Cerebro will open the richer upgrade view here."
        />
      </SectionCard>
    );
  }

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onBackToDashboard },
          { label: "Gear", onClick: onBackToGear },
          { label: gearRecommendations.combat_style },
        ]}
      />
      <SectionCard
        title="Gear Detail"
        subtitle={`${gearRecommendations.combat_style} upgrades`}
        action={
          <div className="inline-actions">
            <button className="ghost-button" onClick={onBackToGear} type="button">
              All gear
            </button>
            <button className="primary-button" onClick={onReloadGear} type="button">
              Refresh upgrades
            </button>
          </div>
        }
      >
        <div className="detail-page-hero">
          <div className="detail-card">
            <h3>Upgrade context</h3>
            <strong>{gearRecommendations.combat_style} | {gearRecommendations.budget_tier}</strong>
            <p className="muted-copy">
              Account: {selectedAccountRsn ?? "none selected"} | Recommendations: {gearRecommendations.recommendations.length}
            </p>
          </div>
          <div className="detail-card">
            <h3>Why this page exists</h3>
            <strong>Upgrade planning needs more than a list.</strong>
            <p className="muted-copy">
              This detail view gives us room for slot-by-slot upgrade ladders, setup examples, and richer progression notes later.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Upgrade Ladder"
        subtitle="Live item suggestions from the backend recommendation layer."
      >
        <div className="stack-list">
          {gearRecommendations.recommendations.map((item) => (
            <div className="detail-card" key={`${item.slot}-${item.item_name}`}>
              <div className="list-row">
                <div>
                  <strong>{item.item_name}</strong>
                  <p>{item.upgrade_reason}</p>
                </div>
                <div className="inline-actions">
                  <span className="pill">{item.slot}</span>
                  <span className="pill">{item.priority}</span>
                </div>
              </div>
              <div className="chip-row">
                <span className="chip">{item.estimated_cost}</span>
                <span className="chip">{item.budget_tier}</span>
              </div>
              {item.requirements.length > 0 ? (
                <div className="detail-row compact-detail">
                  <strong>Requirements</strong>
                  <ul className="plan-list unordered-list">
                    {item.requirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function TeleportDetailPage(props: {
  onBackToDashboard: () => void;
  onBackToTeleports: () => void;
  onReloadTeleport: () => void;
  selectedAccountRsn: string | null;
  teleportRoute: TeleportRouteResponse | null;
}) {
  const {
    onBackToDashboard,
    onBackToTeleports,
    onReloadTeleport,
    selectedAccountRsn,
    teleportRoute,
  } = props;

  if (!teleportRoute) {
    return (
      <SectionCard
        title="Teleport Detail"
        subtitle="Open a route plan to inspect travel options."
      >
        <EmptyState
          title="No route loaded"
          body="Run the route planner from the teleports page and Cerebro will open the fuller travel view here."
        />
      </SectionCard>
    );
  }

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onBackToDashboard },
          { label: "Teleports", onClick: onBackToTeleports },
          { label: teleportRoute.destination },
        ]}
      />
      <SectionCard
        title="Teleport Detail"
        subtitle={teleportRoute.destination}
        action={
          <div className="inline-actions">
            <button className="ghost-button" onClick={onBackToTeleports} type="button">
              All routes
            </button>
            <button className="primary-button" onClick={onReloadTeleport} type="button">
              Refresh route
            </button>
          </div>
        }
      >
        <div className="detail-page-hero">
          <div className="detail-card">
            <h3>Travel context</h3>
            <strong>{teleportRoute.recommended_route.method}</strong>
            <p className="muted-copy">
              Destination: {teleportRoute.destination} | Account: {selectedAccountRsn ?? "none selected"}
            </p>
            <div className="chip-row">
              <span className="chip">{teleportRoute.preference}</span>
              <span className="chip">{teleportRoute.recommended_route.route_type}</span>
            </div>
          </div>
          <div className="detail-card">
            <h3>Travel read</h3>
            <strong>{teleportRoute.recommended_route.convenience}</strong>
            <p className="muted-copy">{teleportRoute.recommended_route.travel_notes}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Route Breakdown"
        subtitle="Primary route and fallbacks for this destination."
      >
        <div className="stack-list">
          <div className="detail-card">
            <h3>Recommended route</h3>
            <strong>{teleportRoute.recommended_route.method}</strong>
            <p className="muted-copy">{teleportRoute.recommended_route.travel_notes}</p>
            <div className="chip-row">
              <span className="chip">{teleportRoute.recommended_route.route_type}</span>
              <span className="chip">{teleportRoute.recommended_route.convenience}</span>
            </div>
            {teleportRoute.recommended_route.requirements.length > 0 ? (
              <ul className="plan-list unordered-list">
                {teleportRoute.recommended_route.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {teleportRoute.alternatives.length > 0 ? (
            <div className="detail-card">
              <h3>Alternatives</h3>
              <div className="stack-list">
                {teleportRoute.alternatives.map((option) => (
                  <div className="detail-row" key={option.method}>
                    <strong>{option.method}</strong>
                    <p>{option.travel_notes}</p>
                    <small className="muted-copy">
                      {option.route_type} | {option.convenience}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

function RecommendationsPage(props: {
  nextActions: NextActionResponse | null;
  onGoToDashboard: () => void;
  onGoToGoals: () => void;
  onOpenNextAction: (action: NextAction) => void;
  selectedAccountRsn: string | null;
}) {
  const {
    nextActions,
    onGoToDashboard,
    onGoToGoals,
    onOpenNextAction,
    selectedAccountRsn,
  } = props;
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const filteredActions = (nextActions?.actions ?? []).filter((action) => {
    const typeMatches = actionTypeFilter === "all" || action.action_type === actionTypeFilter;
    const priorityMatches = priorityFilter === "all" || action.priority === priorityFilter;
    return typeMatches && priorityMatches;
  });
  const groupedActions = filteredActions.reduce<Record<string, NextAction[]>>((groups, action) => {
    const key = action.action_type;
    groups[key] = [...(groups[key] ?? []), action];
    return groups;
  }, {});

  function formatSupportLabel(value: string) {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatSupportValue(value: unknown) {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    if (typeof value === "string") {
      return value.replaceAll("_", " ");
    }
    return String(value);
  }

  function buildRecommendationSummary(action: NextAction) {
    const supporting = action.supporting_data ?? {};
    const snippets: string[] = [];

    if (typeof supporting.recommended_skill === "string") {
      const level = supporting.current_level;
      snippets.push(
        level !== undefined && level !== null
          ? `Push ${supporting.recommended_skill} next from level ${level}.`
          : `Push ${supporting.recommended_skill} next.`
      );
    }

    if (typeof supporting.recommended_quest === "string") {
      snippets.push(`This path is anchored around ${supporting.recommended_quest}.`);
    }

    if (typeof supporting.recommended_upgrade === "string") {
      snippets.push(`The most relevant upgrade right now is ${supporting.recommended_upgrade}.`);
    }

    if (typeof supporting.recommended_route === "string") {
      snippets.push(`Travel setup points toward ${supporting.recommended_route}.`);
    }

    if (Array.isArray(supporting.missing_skills) && supporting.missing_skills.length > 0) {
      snippets.push(`You still need ${supporting.missing_skills.join(", ")} before this fully opens up.`);
    }

    if (Array.isArray(supporting.recently_progressed_skills) && supporting.recently_progressed_skills.length > 0) {
      snippets.push(`Recent momentum showed up in ${supporting.recently_progressed_skills.join(", ")}.`);
    }

    if (supporting.skill_stalled) {
      snippets.push("The planner thinks this path has stalled recently, so it is surfacing a cleaner next move.");
    }

    if (snippets.length === 0) {
      return action.summary;
    }

    return snippets.join(" ");
  }

  function renderSupportingData(action: NextAction) {
    const entries = Object.entries(action.supporting_data ?? {});
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="supporting-stack">
        <p className="muted-copy supporting-summary">{buildRecommendationSummary(action)}</p>
        <div className="supporting-grid">
        {entries.map(([key, value]) => {
          const label = formatSupportLabel(key);
          if (Array.isArray(value)) {
            return (
              <div className="detail-row compact-detail" key={key}>
                <strong>{label}</strong>
                {value.length > 0 ? (
                  <div className="chip-row">
                    {value.map((item, index) => (
                      <span className="chip" key={`${key}-${index}`}>
                        {typeof item === "string" ? item.replaceAll("_", " ") : JSON.stringify(item)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">None tracked.</p>
                )}
              </div>
            );
          }

          if (value && typeof value === "object") {
            return (
              <div className="detail-row compact-detail" key={key}>
                <strong>{label}</strong>
                <div className="chip-row">
                  {Object.entries(value).map(([nestedKey, nestedValue]) => (
                    <span className="chip" key={`${key}-${nestedKey}`}>
                      {formatSupportLabel(nestedKey)}: {formatSupportValue(nestedValue)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div className="detail-row compact-detail" key={key}>
              <strong>{label}</strong>
              <p className="muted-copy">{formatSupportValue(value)}</p>
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page-grid">
      <DetailBreadcrumbs
        items={[
          { label: "Dashboard", onClick: onGoToDashboard },
          { label: "Recommendations" },
        ]}
      />
      <SectionCard
        title="Recommendations"
        subtitle="A fuller ranked action board for your workspace."
        action={
          <button className="ghost-button" onClick={onGoToGoals} type="button">
            Open goals
          </button>
        }
      >
        <SurfaceLead
          summary="This is the planning board version of Cerebro's ranked output. Use it when you want to compare actions instead of just acting on the top one."
          highlights={[
            `Account ${selectedAccountRsn ?? "none selected"}`,
            `Goal ${nextActions?.goal_title ?? "not anchored"}`,
            `Actions ${filteredActions.length}`,
          ]}
        />
        {nextActions ? (
          <>
            <div className="surface-toolbar">
              <div className="chip-row">
                {["all", "quest", "skill", "gear", "travel"].map((item) => (
                  <button
                    key={item}
                    className={`chip-button${actionTypeFilter === item ? " is-active" : ""}`}
                    onClick={() => setActionTypeFilter(item)}
                    type="button"
                  >
                    {item === "all" ? "All types" : item}
                  </button>
                ))}
              </div>
              <div className="chip-row">
                {["all", "high", "medium", "low"].map((item) => (
                  <button
                    key={item}
                    className={`chip-button${priorityFilter === item ? " is-active" : ""}`}
                    onClick={() => setPriorityFilter(item)}
                    type="button"
                  >
                    {item === "all" ? "All priorities" : item}
                  </button>
                ))}
              </div>
            </div>
            {Object.keys(groupedActions).length > 0 ? (
              <div className="recommendation-groups">
                {Object.entries(groupedActions).map(([group, actions]) => (
                  <div className="detail-card recommendation-group-card" key={group}>
                    <div className="section-split">
                      <div>
                        <p className="section-label">Action group</p>
                        <h3>{group}</h3>
                      </div>
                      <span className="pill">{actions.length}</span>
                    </div>
                    <div className="stack-list">
                      {actions.map((action, index) => (
                        <div
                          className={`detail-card recommendation-card${index === 0 ? " recommendation-card-top" : ""}`}
                          key={`${action.action_type}-${action.title}`}
                        >
                          <div className="list-row action-row">
                            <div>
                              <strong>
                                {index === 0 ? "Top in group" : `Option ${index + 1}`} | {action.title}
                              </strong>
                              <p>{action.summary}</p>
                            </div>
                            <div className="inline-actions">
                              <span className="score-pill">{action.score}</span>
                              <button
                                className="ghost-button"
                                onClick={() => onOpenNextAction(action)}
                                type="button"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                          <div className="chip-row">
                            <span className="chip">{action.action_type}</span>
                            <span className="chip">{action.priority}</span>
                            {action.blockers.length > 0 ? (
                              <span className="chip">Blockers {action.blockers.length}</span>
                            ) : (
                              <span className="chip">No blockers</span>
                            )}
                          </div>
                          {action.blockers.length > 0 ? (
                            <div className="detail-row compact-detail">
                              <strong>Current blockers</strong>
                              <ul className="plan-list unordered-list">
                                {action.blockers.map((blocker) => (
                                  <li key={blocker}>{blocker}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {renderSupportingData(action)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No actions matched those filters"
                body="Try broadening the type or priority filters to bring more recommendations back into view."
              />
            )}
          </>
        ) : (
          <EmptyState
            title="No ranked actions yet"
            body="Link an account and goal, then Cerebro will turn the planner output into a full action board here."
          />
        )}
      </SectionCard>
    </div>
  );
}

function ChatPage(props: {
  busyAction: string | null;
  chatHistory: ChatExchange[];
  chatPrompt: string;
  chatReply: string;
  chatSessions: ChatSession[];
  onRunChatPrompt: (promptOverride?: string) => void;
  selectedAccountRsn: string | null;
  selectedChatSessionId: number | null;
  setSelectedChatSessionId: Dispatch<SetStateAction<number | null>>;
  setChatPrompt: Dispatch<SetStateAction<string>>;
}) {
  const {
    busyAction,
    chatHistory,
    chatPrompt,
    chatReply,
    chatSessions,
    onRunChatPrompt,
    selectedAccountRsn,
    selectedChatSessionId,
    setSelectedChatSessionId,
    setChatPrompt,
  } = props;
  const visibleHistory =
    selectedChatSessionId === null
      ? chatHistory
      : chatHistory.filter((exchange) => exchange.sessionId === selectedChatSessionId);

  return (
    <SectionCard
      title="Ask Cerebro"
      subtitle="A fuller workspace for deterministic coaching over your planner data."
      action={
        <div className="goal-form">
          <input
            className="text-input"
            value={chatPrompt}
            onChange={(event) => setChatPrompt(event.target.value)}
            placeholder="Ask Cerebro anything about your account"
          />
          <button
            className="primary-button"
            onClick={() => onRunChatPrompt()}
            type="button"
          >
            {busyAction === "chat" ? "Thinking..." : "Send prompt"}
          </button>
        </div>
      }
    >
      <div className="chat-preview">
        <SurfaceLead
          summary="Best for quick guidance questions tied to your workspace, especially when you want the planner turned into plain-language advice."
          highlights={[
            `Account ${selectedAccountRsn ?? "none selected"}`,
            `Sessions ${chatSessions.length}`,
            `Exchanges ${chatHistory.length}`,
          ]}
        />
        <div className="chat-layout">
          <div className="detail-card">
            <h3>Quick prompts</h3>
            <div className="stack-list">
              {[
                "What's my next best action?",
                "Which quest should I do for barrows gloves?",
                "What skill should I train next?",
                "What changed since my last sync?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="tile-button"
                  onClick={() => onRunChatPrompt(prompt)}
                  type="button"
                >
                  <span>{prompt}</span>
                  <small>Quick prompt</small>
                </button>
              ))}
            </div>
          </div>
          <div className="detail-card">
            <h3>Latest reply</h3>
            <div className="chat-bubble chat-bubble-strong">
              {chatReply || "Use the prompt box above to ask Cerebro for planning advice."}
            </div>
          </div>
        </div>
        <div className="detail-card">
          <h3>Session list</h3>
          <div className="chip-row">
            {chatSessions.length === 0 ? <span className="muted-copy">No sessions yet.</span> : null}
            {chatSessions.map((session) => (
              <button
                className={`chip-button${selectedChatSessionId === session.id ? " is-active" : ""}`}
                key={session.id}
                onClick={() => setSelectedChatSessionId(session.id)}
                type="button"
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>
        {visibleHistory.length > 0 ? (
          <div className="detail-card">
            <h3>{selectedChatSessionId ? "Selected session history" : "Recent exchanges"}</h3>
            <div className="stack-list">
              {visibleHistory.map((exchange) => (
                <div className="detail-row" key={`${exchange.sessionId}-${exchange.prompt}`}>
                  <strong>{exchange.prompt}</strong>
                  <p>{exchange.reply}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title={selectedChatSessionId ? "No exchanges in this session yet" : "No chat history yet"}
            body={
              selectedChatSessionId
                ? "Use the prompt box above to keep building this session."
                : "Send a prompt or use a quick prompt to start building a history for your account workspace."
            }
          />
        )}
      </div>
    </SectionCard>
  );
}

function SectionCard(props: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <p className="section-label">{props.title}</p>
          <h3>{props.subtitle}</h3>
        </div>
        {props.action ? <div>{props.action}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

function DetailBreadcrumbs(props: {
  items: Array<{ label: string; onClick?: () => void }>;
}) {
  return (
    <div className="detail-breadcrumbs" aria-label="Breadcrumb">
      {props.items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span className="breadcrumb-separator">/</span> : null}
          {item.onClick ? (
            <button className="breadcrumb-link" onClick={item.onClick} type="button">
              {item.label}
            </button>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function SurfaceLead(props: {
  summary: string;
  highlights: string[];
}) {
  return (
    <div className="surface-lead">
      <p className="surface-lead-copy">{props.summary}</p>
      <div className="chip-row">
        {props.highlights.map((item) => (
          <span className="chip" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState(props: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.body}</p>
      {props.action ? props.action : null}
    </div>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function AuthView(props: {
  authMode: "login" | "register";
  backendStatus: "online" | "offline" | "checking";
  busyAction: string | null;
  error: string | null;
  loginEmail: string;
  loginDisplayName: string;
  loginPassword: string;
  setAuthMode: (value: "login" | "register") => void;
  setLoginEmail: (value: string) => void;
  setLoginDisplayName: (value: string) => void;
  setLoginPassword: (value: string) => void;
  onLogin: () => void;
  onPasswordSubmit: () => void;
}) {
  const isRegister = props.authMode === "register";

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Cerebro OSRS</p>
        <h2>{isRegister ? "Create your planning workspace." : "Sign in to your planner cockpit."}</h2>
        <p className="hero-copy">
          Real email and password auth now powers the workspace. The old dev shortcut is still available below for local testing and legacy seeded accounts.
        </p>
        <div className={`status-pill is-${props.backendStatus}`}>
          <span className="status-dot" />
          Backend {props.backendStatus}
        </div>
        {props.error ? <div className="banner error-banner">{props.error}</div> : null}
        <div className="auth-highlights">
          <div className="detail-card compact-detail auth-highlight-card">
            <p className="section-label">What you get</p>
            <strong>Your own workspace</strong>
            <p className="muted-copy">
              Accounts, goals, chat sessions, and planning context stay attached to your login instead of one shared demo state.
            </p>
          </div>
          <div className="detail-card compact-detail auth-highlight-card">
            <p className="section-label">For now</p>
            <strong>Built for local development</strong>
            <p className="muted-copy">
              This is a real sign-in flow for the app, but it is still part of the local product buildout while we keep improving the experience.
            </p>
          </div>
        </div>
        <div className="chip-row">
          <button
            className={`chip-button${props.authMode === "login" ? " is-active" : ""}`}
            onClick={() => props.setAuthMode("login")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`chip-button${props.authMode === "register" ? " is-active" : ""}`}
            onClick={() => props.setAuthMode("register")}
            type="button"
          >
            Create account
          </button>
        </div>
        <div className="auth-form">
          <input
            className="text-input"
            value={props.loginEmail}
            onChange={(event) => props.setLoginEmail(event.target.value)}
            placeholder="Email address"
          />
          <input
            className="text-input"
            value={props.loginDisplayName}
            onChange={(event) => props.setLoginDisplayName(event.target.value)}
            placeholder={isRegister ? "Display name" : "Display name (optional)"}
          />
          <input
            className="text-input"
            type="password"
            value={props.loginPassword}
            onChange={(event) => props.setLoginPassword(event.target.value)}
            placeholder={isRegister ? "Password (8+ characters)" : "Password"}
          />
          <p className="muted-copy auth-note">
            {isRegister
              ? "Pick a password with at least 8 characters for this local workspace. You can keep using the same email as the app becomes more fully personalized."
              : "Use the password tied to this local workspace account. If you created an older seeded account, the dev shortcut below still works."}
          </p>
          <button className="primary-button" onClick={props.onPasswordSubmit} type="button">
            {props.busyAction === "login"
              ? "Signing in..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </div>
        <div className="detail-card compact-detail">
          <h3>Local dev shortcut</h3>
          <p className="muted-copy">
            If you already have a local workspace created during the earlier dev-login phase, you can still use the shortcut here while we transition.
          </p>
          <button className="ghost-button" onClick={props.onLogin} type="button">
            Use dev shortcut
          </button>
        </div>
      </section>
    </div>
  );
}
