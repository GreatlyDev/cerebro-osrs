import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "./api";
import { storeSessionToken } from "./api";
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
  | "skills"
  | "quests"
  | "gear"
  | "teleports"
  | "goals"
  | "profile";

const NAV_ITEMS: Array<{ key: ViewKey; label: string; blurb: string }> = [
  { key: "dashboard", label: "Dashboard", blurb: "Summary, actions, and sync flow" },
  { key: "ask-cerebro", label: "Ask Cerebro", blurb: "Structured chat over the backend" },
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

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = getViewFromPath(location.pathname);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalPlan, setSelectedGoalPlan] = useState<GoalPlanResponse | null>(null);
  const [nextActions, setNextActions] = useState<NextActionResponse | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AccountSnapshot | null>(null);
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
  const [progressDraft, setProgressDraft] = useState({
    completed_quests: "",
    unlocked_transports: "",
    owned_gear: "",
    active_unlocks: "",
  });
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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
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
    if (location.pathname !== "/" && !(Object.values(VIEW_PATHS) as string[]).includes(location.pathname)) {
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
        await loadDashboard();
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

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setBackendStatus("checking");
    try {
      const [healthResponse, profileResponse, accountsResponse, goalsResponse, nextActionsResponse] =
        await Promise.all([
          api.getHealth(),
          api.getProfile(),
          api.listAccounts(),
          api.listGoals(),
          api.getNextActions({ limit: 4 }),
        ]);
      setBackendStatus(healthResponse.status === "ok" ? "online" : "offline");
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
        const [latestSnapshot, latestProgress] = await Promise.all([
          api.getAccountSnapshot(latestAccount.id).catch(() => null),
          api.getAccountProgress(latestAccount.id).catch(() => null),
        ]);
        setSelectedSnapshot(latestSnapshot);
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
        setSelectedProgress(null);
        setSelectedAccountId(null);
        setProgressDraft({
          completed_quests: "",
          unlocked_transports: "",
          owned_gear: "",
          active_unlocks: "",
        });
      }
    } catch (err) {
      setBackendStatus("offline");
      setError(err instanceof Error ? err.message : "Unable to load Cerebro.");
    } finally {
      setLoading(false);
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
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleSignOut() {
    storeSessionToken(null);
    setCurrentUser(null);
    setProfile(null);
    setAccounts([]);
    setGoals([]);
    setNextActions(null);
    setSelectedGoalPlan(null);
    setSelectedSnapshot(null);
    setSelectedProgress(null);
    setSelectedAccountId(null);
    setChatSessions([]);
    setChatHistory([]);
    setChatReply("");
    setProgressDraft({
      completed_quests: "",
      unlocked_transports: "",
      owned_gear: "",
      active_unlocks: "",
    });
    setError(null);
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
      const [snapshot, progress] = await Promise.all([
        api.getAccountSnapshot(account.id),
        api.getAccountProgress(account.id).catch(() => null),
      ]);
      setSelectedSnapshot(snapshot);
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
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate goal plan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateGoal() {
    if (!newGoalTitle.trim()) {
      return;
    }
    setBusyAction("create-goal");
    setError(null);
    try {
      const goal = await api.createGoal({
        title: newGoalTitle.trim(),
        goal_type: newGoalType,
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
      let session = chatSessions[0];
      if (!session) {
        session = await api.createChatSession("Frontend Prompt");
        setChatSessions((current) => [session, ...current]);
      }
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

  async function handleLoadSkill(skillKey: string) {
    setBusyAction(`skill-${skillKey}`);
    setError(null);
    try {
      const response = await api.getSkillRecommendations(skillKey, selectedAccountRsn);
      setSkillRecommendations(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load skill recommendations.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleInspectAccount(account: Account) {
    setBusyAction(`inspect-${account.id}`);
    setError(null);
    try {
      const [snapshot, progress] = await Promise.all([
        api.getAccountSnapshot(account.id),
        api.getAccountProgress(account.id).catch(() => null),
      ]);
      setSelectedSnapshot(snapshot);
      setSelectedProgress(progress);
      setProgressDraft({
        completed_quests: formatListDraft(progress?.completed_quests ?? []),
        unlocked_transports: formatListDraft(progress?.unlocked_transports ?? []),
        owned_gear: formatListDraft(progress?.owned_gear ?? []),
        active_unlocks: formatListDraft(progress?.active_unlocks ?? []),
      });
      setSelectedAccountId(account.id);
      navigateToView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No snapshot found for that account yet.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadQuest(questId: string) {
    setBusyAction(`quest-${questId}`);
    setError(null);
    try {
      const quest = await api.getQuest(questId);
      setSelectedQuest(quest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load quest.");
    } finally {
      setBusyAction(null);
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
      navigateToView("gear");
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
      navigateToView("teleports");
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
  const workspaceChecklist = buildWorkspaceChecklist(profile, accounts, goals);
  const workspaceProgress = workspaceChecklist.filter((item) => item.done).length;

  useEffect(() => {
    if (selectedAccountRsn && !newGoalTargetRsn) {
      setNewGoalTargetRsn(selectedAccountRsn);
    }
  }, [selectedAccountRsn, newGoalTargetRsn]);

  function handleSelectAccount(accountId: number | null) {
    setSelectedAccountId(accountId);

    if (accountId === null) {
      setSelectedSnapshot(null);
      setSelectedProgress(null);
      setProgressDraft({
        completed_quests: "",
        unlocked_transports: "",
        owned_gear: "",
        active_unlocks: "",
      });
      return;
    }

    const account = accounts.find((item) => item.id === accountId);
    if (account) {
      void handleInspectAccount(account);
    }
  }

  if (!authReady) {
    return <div className="app-shell auth-shell"><div className="banner">Loading Cerebro...</div></div>;
  }

  if (backendStatus === "offline" && !currentUser) {
    return (
      <AuthView
        backendStatus={backendStatus}
        busyAction={busyAction}
        error={error}
        loginDisplayName={loginDisplayName}
        loginEmail={loginEmail}
        onLogin={handleDevLogin}
        setLoginDisplayName={setLoginDisplayName}
        setLoginEmail={setLoginEmail}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthView
        backendStatus={backendStatus}
        busyAction={busyAction}
        error={error}
        loginDisplayName={loginDisplayName}
        loginEmail={loginEmail}
        onLogin={handleDevLogin}
        setLoginDisplayName={setLoginDisplayName}
        setLoginEmail={setLoginEmail}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Cerebro OSRS</p>
          <h1>Planner cockpit for RuneScape progression.</h1>
          <p className="brand-copy">
            FastAPI intelligence underneath, frontend shell on top, and room for AI
            when it actually adds product value.
          </p>
        </div>

        <div className="sidebar-status">
          <div className={`status-pill is-${backendStatus}`}>
            <span className="status-dot" />
            Backend {backendStatus}
          </div>
          <div className="detail-card compact-user-card">
            <p className="section-label">Signed in</p>
            <strong>{currentUser.display_name}</strong>
            <p className="muted-copy">{currentUser.email}</p>
            <button className="ghost-button" onClick={handleSignOut} type="button">
              Sign out
            </button>
          </div>
          <select
            className="select-input"
            value={selectedAccountId ?? ""}
            onChange={(event) =>
              handleSelectAccount(event.target.value ? Number(event.target.value) : null)
            }
          >
            {accounts.length === 0 ? <option value="">No account selected</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.rsn}
              </option>
            ))}
          </select>
        </div>

        <nav className="nav-grid">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item${activeView === item.key ? " is-active" : ""}`}
              onClick={() => navigateToView(item.key)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.blurb}</small>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Your workspace</p>
            <h2>
              {profile
                ? `Welcome back, ${profile.display_name}.`
                : "Cerebro frontend is coming online."}
            </h2>
            <p className="hero-copy">
              This workspace now runs on your own accounts, goals, chat sessions, and
              recommendation context instead of one shared planner for everyone.
            </p>
          </div>

          <div className="hero-stats">
            <Metric label="Accounts" value={accounts.length} />
            <Metric label="Goals" value={goals.length} />
            <Metric label="Setup" value={`${workspaceProgress}/4`} />
          </div>
        </header>

        {error ? <div className="banner error-banner">{error}</div> : null}
        {loading ? <div className="banner">Loading Cerebro surfaces...</div> : null}

        {!loading ? (
          <>
            {activeView === "dashboard" ? (
              <DashboardView
                accounts={accounts}
                busyAction={busyAction}
                currentUser={currentUser}
                goals={goals}
                nextActions={nextActions}
                onGoToGoals={() => navigateToView("goals")}
                onGoToProfile={() => navigateToView("profile")}
                onCreateAccount={handleCreateAccount}
                onInspectAccount={handleInspectAccount}
                onQuickstartAccount={handleQuickstartAccount}
                onQuickstartGoal={handleQuickstartGoal}
                onGeneratePlan={handleGeneratePlan}
                onSaveAccountProgress={handleSaveAccountProgress}
                onSetPrimaryAccount={handleSetPrimaryAccount}
                onSyncAccount={handleSyncAccount}
                profile={profile}
                progressDraft={progressDraft}
                selectedAccount={selectedAccount}
                selectedProgress={selectedProgress}
                selectedSnapshot={selectedSnapshot}
                newAccountRsn={newAccountRsn}
                selectedAccountId={selectedAccountId}
                setProgressDraft={setProgressDraft}
                setNewAccountRsn={setNewAccountRsn}
                workspaceChecklist={workspaceChecklist}
                workspaceProgress={workspaceProgress}
              />
            ) : null}

            {activeView === "ask-cerebro" ? (
              <SectionCard
                title="Ask Cerebro"
                subtitle="Chat is still deterministic, but it already uses the real planning stack."
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
                      onClick={() => handleRunChatPrompt()}
                      type="button"
                    >
                      {busyAction === "chat" ? "Thinking..." : "Send prompt"}
                    </button>
                  </div>
                }
              >
                <div className="chat-preview">
                <div className="page-tip">
                  Best for quick guidance questions tied to your own workspace, like progression, quest choices, or what to do next on the selected account.
                </div>
                  <div>
                    <p className="section-label">Sessions</p>
                  <div className="chip-row">
                      {chatSessions.length === 0 ? <span className="muted-copy">No sessions yet.</span> : null}
                      {chatSessions.map((session) => (
                        <span className="chip" key={session.id}>
                          {session.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="chat-bubble">
                    {chatReply ||
                      "Use the button above to hit the backend chat flow from the frontend."}
                  </div>
                  <div className="stack-list">
                    {[
                      "What's my next best action?",
                      "Which quest should I do for barrows gloves?",
                      "What skill should I train next?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        className="tile-button"
                        onClick={() => handleRunChatPrompt(prompt)}
                        type="button"
                      >
                        <span>{prompt}</span>
                        <small>Quick prompt</small>
                      </button>
                    ))}
                  </div>
                  {chatHistory.length > 0 ? (
                    <div className="detail-card">
                      <h3>Recent exchanges</h3>
                      <div className="stack-list">
                        {chatHistory.slice(0, 3).map((exchange) => (
                          <div className="detail-row" key={`${exchange.sessionId}-${exchange.prompt}`}>
                            <strong>{exchange.prompt}</strong>
                            <p>{exchange.reply}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No chat history yet"
                      body="Send a prompt or use a quick prompt to start building a history for your account workspace."
                    />
                  )}
                </div>
              </SectionCard>
            ) : null}

            {activeView === "skills" ? (
              <SectionCard
                title="Skills"
                subtitle="Live catalog and recommendation fetches from the backend."
                action={
                  <input
                    className="text-input"
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.target.value)}
                    placeholder="Search skills"
                  />
                }
              >
                <div className="page-tip">
                  Pick a skill to get methods tailored to the selected account and current profile preferences.
                </div>
                <div className="tile-grid">
                  {filteredSkills.map((skill) => (
                    <button
                      key={skill.key}
                      className="tile-button"
                      onClick={() => handleLoadSkill(skill.key)}
                      type="button"
                    >
                      <span>{skill.label}</span>
                      <small>{skill.category}</small>
                    </button>
                  ))}
                </div>
                {filteredSkills.length === 0 ? (
                  <EmptyState
                    title="No skills matched"
                    body="Try a different search term or clear the filter to browse the full catalog."
                  />
                ) : null}
                {skillRecommendations ? (
                  <div className="detail-card">
                    <h3>{skillRecommendations.skill} recommendations</h3>
                    <p className="muted-copy">
                      Account: {selectedAccountRsn ?? "none"} | Preference:{" "}
                      {skillRecommendations.preference} | Current level:{" "}
                      {skillRecommendations.current_level ?? "unknown"}
                    </p>
                    {skillRecommendations.recommendations.slice(0, 2).map((recommendation) => (
                      <div className="detail-row" key={recommendation.method}>
                        <strong>{recommendation.method}</strong>
                        <span>{recommendation.estimated_xp_rate}</span>
                        <p>{recommendation.rationale}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No skill loaded"
                    body="Choose a skill card to fetch live recommendations for the selected account in your workspace."
                  />
                )}
              </SectionCard>
            ) : null}

            {activeView === "quests" ? (
              <SectionCard
                title="Quests"
                subtitle="Structured quest catalog from the backend service layer."
                action={
                  <input
                    className="text-input"
                    value={questSearch}
                    onChange={(event) => setQuestSearch(event.target.value)}
                    placeholder="Search quests"
                  />
                }
              >
                <div className="page-tip">
                  Browse for unlocks, then open details to see what the quest gives back and what it enables next.
                </div>
                <div className="stack-list">
                  {filteredQuests.map((quest) => (
                    <div className="list-row" key={quest.id}>
                      <div>
                        <strong>{quest.name}</strong>
                        <p>{quest.recommendation_reason}</p>
                      </div>
                      <div className="inline-actions">
                        <span className="pill">{quest.difficulty}</span>
                        <button
                          className="ghost-button"
                          onClick={() => handleLoadQuest(quest.id)}
                          type="button"
                        >
                          {busyAction === `quest-${quest.id}` ? "Opening..." : "Details"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredQuests.length === 0 ? (
                  <EmptyState
                    title="No quests matched"
                    body="Try a different search term or clear the filter to browse the quest catalog."
                  />
                ) : null}
                {selectedQuest ? (
                  <div className="plan-panel">
                    <div className="plan-header">
                      <div>
                        <p className="section-label">Quest Detail</p>
                        <h3>{selectedQuest.name}</h3>
                      </div>
                      <span className="pill">{selectedQuest.category}</span>
                    </div>
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
                    <div className="detail-card">
                      <h3>Why it matters</h3>
                      <p className="muted-copy">{selectedQuest.why_it_matters}</p>
                      <h3>Next steps</h3>
                      <ol className="plan-list">
                        {selectedQuest.next_steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No quest selected"
                    body="Open a quest from the list to inspect requirements, rewards, and next steps."
                  />
                )}
              </SectionCard>
            ) : null}

            {activeView === "goals" ? (
              <SectionCard
                title="Goals"
                subtitle="Active goals with one-click plan generation."
                action={
                  <div className="goal-form">
                    <input
                      className="text-input"
                      value={newGoalTitle}
                      onChange={(event) => setNewGoalTitle(event.target.value)}
                      placeholder="Goal title"
                    />
                    <select
                      className="select-input"
                      value={newGoalType}
                      onChange={(event) => setNewGoalType(event.target.value)}
                    >
                      <option value="quest cape">Quest Cape</option>
                      <option value="barrows gloves">Barrows Gloves</option>
                      <option value="fire cape">Fire Cape</option>
                    </select>
                    <input
                      className="text-input"
                      value={newGoalTargetRsn}
                      onChange={(event) => setNewGoalTargetRsn(event.target.value)}
                      placeholder="Target RSN (optional)"
                    />
                    <button
                      className="ghost-button"
                      onClick={() => setNewGoalTargetRsn(selectedAccountRsn ?? "")}
                      type="button"
                    >
                      Use selected account
                    </button>
                    <button
                      className="primary-button"
                      onClick={handleCreateGoal}
                      type="button"
                    >
                      {busyAction === "create-goal" ? "Creating..." : "Create goal"}
                    </button>
                  </div>
                }
              >
                <div className="page-tip">
                  Goals are where the planner becomes more opinionated. Create one, then generate a plan to anchor the rest of the app.
                </div>
                <div className="stack-list">
                  {goals.map((goal) => (
                    <div className="list-row" key={goal.id}>
                      <div>
                        <strong>{goal.title}</strong>
                        <p>{goal.goal_type}</p>
                      </div>
                      <button
                        className="ghost-button"
                        onClick={() => handleGeneratePlan(goal)}
                        type="button"
                      >
                        {busyAction === `plan-${goal.id}` ? "Generating..." : "Generate plan"}
                      </button>
                    </div>
                  ))}
                </div>
                {selectedGoalPlan ? (
                  <div className="plan-panel">
                    <div className="plan-header">
                      <div>
                        <p className="section-label">Generated Plan</p>
                        <h3>{selectedGoalPlan.summary}</h3>
                      </div>
                      <span className="pill">{selectedGoalPlan.status}</span>
                    </div>
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
                          {Object.entries(selectedGoalPlan.recommendations).map(([key, value]) => (
                            <div className="detail-row compact-detail" key={key}>
                              <strong>{key.replaceAll("_", " ")}</strong>
                              <pre className="code-block compact-code">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No plan selected"
                    body="Generate a goal plan to inspect the steps and recommendation payload for one of your goals."
                  />
                )}
              </SectionCard>
            ) : null}

            {activeView === "gear" ? (
              <SectionCard
                title="Gear"
                subtitle="Generate live gear upgrade recommendations from the backend."
                action={
                  <div className="goal-form">
                    <select
                      className="select-input"
                      value={gearCombatStyle}
                      onChange={(event) => setGearCombatStyle(event.target.value)}
                    >
                      <option value="melee">Melee</option>
                      <option value="magic">Magic</option>
                      <option value="ranged">Ranged</option>
                    </select>
                    <select
                      className="select-input"
                      value={gearBudgetTier}
                      onChange={(event) => setGearBudgetTier(event.target.value)}
                    >
                      <option value="budget">Budget</option>
                      <option value="midgame">Midgame</option>
                    </select>
                    <input
                      className="text-input"
                      value={gearCurrentItems}
                      onChange={(event) => setGearCurrentItems(event.target.value)}
                      placeholder="Owned gear, comma-separated"
                    />
                    <button className="primary-button" onClick={handleLoadGear} type="button">
                      {busyAction === "gear" ? "Loading..." : "Get upgrades"}
                    </button>
                  </div>
                }
              >
                <div className="page-tip">
                  Tell Cerebro what style and budget you care about, then filter out owned gear so the upgrades stay relevant.
                </div>
                {gearRecommendations ? (
                  <div className="recommendation-grid">
                    <p className="muted-copy">
                      Showing upgrades for {selectedAccountRsn ?? "no selected account"}.
                    </p>
                    {gearRecommendations.recommendations.map((item) => (
                      <div className="detail-row" key={item.item_name}>
                        <strong>
                          {item.item_name} | {item.slot}
                        </strong>
                        <span>
                          {item.priority} priority | {item.estimated_cost}
                        </span>
                        <p>{item.upgrade_reason}</p>
                        <small className="muted-copy">
                          Requirements: {item.requirements.join(", ")}
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No gear recommendations yet"
                    body="Pick a combat style and budget tier, then fetch upgrade recommendations for the selected account."
                  />
                )}
              </SectionCard>
            ) : null}

            {activeView === "teleports" ? (
              <SectionCard
                title="Teleports"
                subtitle="Get a live route recommendation for a destination."
                action={
                  <div className="goal-form">
                    <select
                      className="select-input"
                      value={teleportDestination}
                      onChange={(event) => setTeleportDestination(event.target.value)}
                    >
                      <option value="fossil island">Fossil Island</option>
                      <option value="barrows">Barrows</option>
                      <option value="wintertodt">Wintertodt</option>
                      <option value="fairy ring network">Fairy Ring Network</option>
                    </select>
                    <select
                      className="select-input"
                      value={teleportPreference}
                      onChange={(event) => setTeleportPreference(event.target.value)}
                    >
                      <option value="balanced">Balanced</option>
                      <option value="convenience">Convenience</option>
                      <option value="low-cost">Low Cost</option>
                    </select>
                    <button
                      className="primary-button"
                      onClick={handleLoadTeleport}
                      type="button"
                    >
                      {busyAction === "teleport" ? "Routing..." : "Find route"}
                    </button>
                  </div>
                }
              >
                <div className="page-tip">
                  Use this when movement friction is the blocker. The backend can already account for tracked unlocks and fallback routes.
                </div>
                {teleportRoute ? (
                  <div className="plan-panel">
                    <div className="detail-card">
                      <p className="section-label">Selected account</p>
                      <p className="muted-copy">{selectedAccountRsn ?? "none"}</p>
                      <h3>{teleportRoute.recommended_route.method}</h3>
                      <p className="muted-copy">
                        {teleportRoute.recommended_route.travel_notes}
                      </p>
                      <small className="muted-copy">
                        Requirements: {teleportRoute.recommended_route.requirements.join(", ")}
                      </small>
                    </div>
                    {teleportRoute.alternatives.length > 0 ? (
                      <div className="detail-card">
                        <h3>Alternatives</h3>
                        <div className="recommendation-grid">
                          {teleportRoute.alternatives.map((option) => (
                            <div className="detail-row" key={option.method}>
                              <strong>{option.method}</strong>
                              <p>{option.travel_notes}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState
                    title="No route calculated yet"
                    body="Pick a destination and run the route finder to see travel options for your current workspace account."
                  />
                )}
              </SectionCard>
            ) : null}

            {activeView === "profile" ? (
              <SectionCard
                title="Profile"
                subtitle="Edit the frontend defaults that shape backend recommendations."
                action={
                  <button
                    className="primary-button"
                    onClick={handleSaveProfile}
                    type="button"
                  >
                    {busyAction === "profile" ? "Saving..." : "Save profile"}
                  </button>
                }
              >
                <div className="page-tip">
                  These preferences influence recommendation tone and routing across the rest of the app, so this page acts like your planning baseline.
                </div>
                <div className="profile-grid">
                  <input
                    className="text-input"
                    value={profileDraft.display_name}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        display_name: event.target.value,
                      }))
                    }
                    placeholder="Display name"
                  />
                  <input
                    className="text-input"
                    value={profileDraft.primary_account_rsn}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        primary_account_rsn: event.target.value,
                      }))
                    }
                    placeholder="Primary account RSN"
                  />
                  <select
                    className="select-input"
                    value={profileDraft.play_style}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        play_style: event.target.value,
                      }))
                    }
                  >
                    <option value="balanced">Balanced</option>
                    <option value="afk">AFK</option>
                    <option value="profitable">Profitable</option>
                  </select>
                  <select
                    className="select-input"
                    value={profileDraft.goals_focus}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        goals_focus: event.target.value,
                      }))
                    }
                  >
                    <option value="progression">Progression</option>
                    <option value="quest cape">Quest Cape</option>
                    <option value="bossing">Bossing</option>
                  </select>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={profileDraft.prefers_afk_methods}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          prefers_afk_methods: event.target.checked,
                        }))
                      }
                    />
                    <span>Prefer AFK methods</span>
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={profileDraft.prefers_profitable_methods}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          prefers_profitable_methods: event.target.checked,
                        }))
                      }
                    />
                    <span>Prefer profitable methods</span>
                  </label>
                </div>
                <div className="detail-card onboarding-card">
                  <div className="section-split">
                    <div>
                      <p className="section-label">Linked accounts</p>
                      <h3>Choose a primary account for this workspace.</h3>
                    </div>
                    {accounts.length > 0 ? (
                      <button
                        className="ghost-button"
                        onClick={() =>
                          setProfileDraft((current) => ({
                            ...current,
                            primary_account_rsn: selectedAccountRsn ?? current.primary_account_rsn,
                          }))
                        }
                        type="button"
                      >
                        Use selected account
                      </button>
                    ) : null}
                  </div>
                  {accounts.length > 0 ? (
                    <div className="chip-row">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          className={`chip-button${
                            profileDraft.primary_account_rsn === account.rsn ? " is-active" : ""
                          }`}
                          onClick={() =>
                            setProfileDraft((current) => ({
                              ...current,
                              primary_account_rsn: account.rsn,
                            }))
                          }
                          type="button"
                        >
                          {account.rsn}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No linked accounts yet"
                      body="Add an RSN on the dashboard first, then come back here to mark it as the primary account for this workspace."
                    />
                  )}
                </div>
              </SectionCard>
            ) : null}

          </>
        ) : null}
      </main>
    </div>
  );
}

function DashboardView(props: {
  accounts: Account[];
  busyAction: string | null;
  currentUser: AuthUser;
  goals: Goal[];
  nextActions: NextActionResponse | null;
  onGoToGoals: () => void;
  onGoToProfile: () => void;
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
    onGoToGoals,
    onGoToProfile,
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
    selectedSnapshot,
    newAccountRsn,
    selectedAccountId,
    setProgressDraft,
    setNewAccountRsn,
    workspaceChecklist,
    workspaceProgress,
  } = props;

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
                <div className="score-pill">{action.score}</div>
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
  backendStatus: "online" | "offline" | "checking";
  busyAction: string | null;
  error: string | null;
  loginEmail: string;
  loginDisplayName: string;
  setLoginEmail: (value: string) => void;
  setLoginDisplayName: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Cerebro OSRS</p>
        <h2>Sign in to your planner cockpit.</h2>
        <p className="hero-copy">
          This is a lightweight dev sign-in for now, but it gives the app a real user
          identity instead of one shared profile for everyone.
        </p>
        <div className={`status-pill is-${props.backendStatus}`}>
          <span className="status-dot" />
          Backend {props.backendStatus}
        </div>
        {props.error ? <div className="banner error-banner">{props.error}</div> : null}
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
            placeholder="Display name (optional)"
          />
          <button className="primary-button" onClick={props.onLogin} type="button">
            {props.busyAction === "login" ? "Signing in..." : "Continue"}
          </button>
        </div>
      </section>
    </div>
  );
}
