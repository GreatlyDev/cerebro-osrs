import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "./api";
import type {
  Account,
  AccountSnapshot,
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
  const [profileDraft, setProfileDraft] = useState({
    display_name: "",
    primary_account_rsn: "",
    play_style: "balanced",
    goals_focus: "progression",
    prefers_afk_methods: false,
    prefers_profitable_methods: false,
  });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    void loadDashboard();
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
        const latestSnapshot = await api
          .getAccountSnapshot(latestAccount.id)
          .catch(() => null);
        setSelectedSnapshot(latestSnapshot);
        setSelectedAccountId(latestAccount.id);
      }
    } catch (err) {
      setBackendStatus("offline");
      setError(err instanceof Error ? err.message : "Unable to load Cerebro.");
    } finally {
      setLoading(false);
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

  async function handleSyncAccount(account: Account) {
    setBusyAction(`sync-${account.id}`);
    setError(null);
    try {
      await api.syncAccount(account.id);
      const snapshot = await api.getAccountSnapshot(account.id);
      setSelectedSnapshot(snapshot);
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
      const snapshot = await api.getAccountSnapshot(account.id);
      setSelectedSnapshot(snapshot);
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

  function handleSelectAccount(accountId: number | null) {
    setSelectedAccountId(accountId);

    if (accountId === null) {
      setSelectedSnapshot(null);
      return;
    }

    const account = accounts.find((item) => item.id === accountId);
    if (account) {
      void handleInspectAccount(account);
    }
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
            <p className="eyebrow">Frontend foundation</p>
            <h2>
              {profile
                ? `Welcome back, ${profile.display_name}.`
                : "Cerebro frontend is coming online."}
            </h2>
            <p className="hero-copy">
              The first pass is focused on real backend integration: accounts, ranked
              next actions, goals, snapshots, and chat.
            </p>
          </div>

          <div className="hero-stats">
            <Metric label="Accounts" value={accounts.length} />
            <Metric label="Goals" value={goals.length} />
            <Metric label="Active RSN" value={selectedAccountRsn ?? "n/a"} />
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
                goals={goals}
                nextActions={nextActions}
                onCreateAccount={handleCreateAccount}
                onInspectAccount={handleInspectAccount}
                onGeneratePlan={handleGeneratePlan}
                onSyncAccount={handleSyncAccount}
                profile={profile}
                selectedSnapshot={selectedSnapshot}
                newAccountRsn={newAccountRsn}
                selectedAccountId={selectedAccountId}
                setNewAccountRsn={setNewAccountRsn}
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
                    Best for quick guidance questions like progression, quest choices, or what to do next on the selected account.
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
                      body="Send a prompt or use a quick prompt to start building a session."
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
                    body="Choose a skill card to fetch live recommendations from the backend."
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
                    body="Generate a goal plan to inspect steps and recommendation payloads here."
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
                    body="Pick a combat style and budget tier, then fetch upgrade recommendations."
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
                    body="Pick a destination and run the route finder to see recommended travel options."
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
  goals: Goal[];
  nextActions: NextActionResponse | null;
  onCreateAccount: () => void;
  onInspectAccount: (account: Account) => void;
  onGeneratePlan: (goal: Goal) => void;
  onSyncAccount: (account: Account) => void;
  profile: Profile | null;
  selectedSnapshot: AccountSnapshot | null;
  newAccountRsn: string;
  selectedAccountId: number | null;
  setNewAccountRsn: (value: string) => void;
}) {
  const {
    accounts,
    busyAction,
    goals,
    nextActions,
    onCreateAccount,
    onInspectAccount,
    onGeneratePlan,
    onSyncAccount,
    profile,
    selectedSnapshot,
    newAccountRsn,
    selectedAccountId,
    setNewAccountRsn,
  } = props;

  return (
    <div className="dashboard-grid">
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
              <p className="muted-copy">No top action available yet.</p>
            )}
          </div>
          <div className="detail-card">
            <h3>Primary account</h3>
            <strong>{profile?.primary_account_rsn ?? accounts[0]?.rsn ?? "Not set"}</strong>
            <p className="muted-copy">
              Play style: {profile?.play_style ?? "unknown"} | Goal focus:{" "}
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
              <p className="muted-copy">Sync an account to see live progression signal.</p>
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
          </div>
        }
      >
        <div className="stack-list">
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              body="Add your first RSN to bring the dashboard to life and unlock sync, snapshots, and planning."
            />
          ) : null}
          {accounts.map((account) => (
            <div className="list-row" key={account.id}>
              <div>
                <strong>{account.rsn}</strong>
                <p>
                  {account.is_active ? "Active account" : "Inactive account"}
                  {selectedAccountId === account.id ? " | viewing snapshot" : ""}
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
        title="Goal Radar"
        subtitle={`Play style: ${profile?.play_style ?? "unknown"}`}
      >
        <div className="stack-list">
          {goals.length === 0 ? (
            <EmptyState
              title="No goals yet"
              body="Create a goal to start generating plans and connect the dashboard to a real target."
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

function EmptyState(props: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.body}</p>
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
