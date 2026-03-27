import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { api } from "./api";
import type {
  Account,
  AccountSnapshot,
  ChatSession,
  Goal,
  NextActionResponse,
  Profile,
  QuestSummary,
  SkillCatalogItem,
  SkillRecommendationResponse,
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

export function App() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [nextActions, setNextActions] = useState<NextActionResponse | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AccountSnapshot | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatReply, setChatReply] = useState("");
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [skillRecommendations, setSkillRecommendations] =
    useState<SkillRecommendationResponse | null>(null);
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [newAccountRsn, setNewAccountRsn] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

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

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [profileResponse, accountsResponse, goalsResponse, nextActionsResponse] =
        await Promise.all([
          api.getProfile(),
          api.listAccounts(),
          api.listGoals(),
          api.getNextActions({ limit: 4 }),
        ]);
      setProfile(profileResponse);
      setAccounts(accountsResponse.items);
      setGoals(goalsResponse.items);
      setNextActions(nextActionsResponse);

      if (accountsResponse.items.length > 0) {
        const latestAccount = accountsResponse.items[accountsResponse.items.length - 1];
        const latestSnapshot = await api
          .getAccountSnapshot(latestAccount.id)
          .catch(() => null);
        setSelectedSnapshot(latestSnapshot);
      }
    } catch (err) {
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
      await api.generateGoalPlan(goal.id);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate goal plan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRunChatPrompt() {
    setBusyAction("chat");
    setError(null);
    try {
      let session = chatSessions[0];
      if (!session) {
        session = await api.createChatSession("Frontend Prompt");
        setChatSessions((current) => [session, ...current]);
      }
      const reply = await api.sendChatMessage(session.id, "What's my next best action?");
      setChatReply(reply.assistant_message.content);
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
      const primaryRsn = profile?.primary_account_rsn ?? accounts[0]?.rsn ?? null;
      const response = await api.getSkillRecommendations(skillKey, primaryRsn);
      setSkillRecommendations(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load skill recommendations.",
      );
    } finally {
      setBusyAction(null);
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

        <nav className="nav-grid">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item${activeView === item.key ? " is-active" : ""}`}
              onClick={() => setActiveView(item.key)}
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
            <Metric label="Actions" value={nextActions?.actions.length ?? 0} />
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
                onGeneratePlan={handleGeneratePlan}
                onSyncAccount={handleSyncAccount}
                profile={profile}
                selectedSnapshot={selectedSnapshot}
                newAccountRsn={newAccountRsn}
                setNewAccountRsn={setNewAccountRsn}
              />
            ) : null}

            {activeView === "ask-cerebro" ? (
              <SectionCard
                title="Ask Cerebro"
                subtitle="Chat is still deterministic, but it already uses the real planning stack."
                action={
                  <button
                    className="primary-button"
                    onClick={handleRunChatPrompt}
                    type="button"
                  >
                    {busyAction === "chat" ? "Thinking..." : "Ask for next best action"}
                  </button>
                }
              >
                <div className="chat-preview">
                  <div>
                    <p className="section-label">Sessions</p>
                    <div className="chip-row">
                      {chatSessions.length === 0 ? (
                        <span className="muted-copy">No sessions yet.</span>
                      ) : null}
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
                </div>
              </SectionCard>
            ) : null}

            {activeView === "skills" ? (
              <SectionCard
                title="Skills"
                subtitle="Live catalog and recommendation fetches from the backend."
              >
                <div className="tile-grid">
                  {skills.map((skill) => (
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
                {skillRecommendations ? (
                  <div className="detail-card">
                    <h3>{skillRecommendations.skill} recommendations</h3>
                    <p className="muted-copy">
                      Preference: {skillRecommendations.preference} | Current level:{" "}
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
                ) : null}
              </SectionCard>
            ) : null}

            {activeView === "quests" ? (
              <SectionCard
                title="Quests"
                subtitle="Structured quest catalog from the backend service layer."
              >
                <div className="stack-list">
                  {quests.map((quest) => (
                    <div className="list-row" key={quest.id}>
                      <div>
                        <strong>{quest.name}</strong>
                        <p>{quest.recommendation_reason}</p>
                      </div>
                      <span className="pill">{quest.difficulty}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {activeView === "goals" ? (
              <SectionCard
                title="Goals"
                subtitle="Active goals with one-click plan generation."
              >
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
              </SectionCard>
            ) : null}

            {activeView === "gear" ||
            activeView === "teleports" ||
            activeView === "profile" ? (
              <SectionCard
                title={NAV_ITEMS.find((item) => item.key === activeView)?.label ?? "Coming soon"}
                subtitle="This page shell is ready for deeper wiring next."
              >
                <p className="muted-copy">
                  The backend surface already exists. The first frontend pass is
                  prioritizing the dashboard, goals, chat, and account sync path.
                </p>
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
  onGeneratePlan: (goal: Goal) => void;
  onSyncAccount: (account: Account) => void;
  profile: Profile | null;
  selectedSnapshot: AccountSnapshot | null;
  newAccountRsn: string;
  setNewAccountRsn: (value: string) => void;
}) {
  const {
    accounts,
    busyAction,
    goals,
    nextActions,
    onCreateAccount,
    onGeneratePlan,
    onSyncAccount,
    profile,
    selectedSnapshot,
    newAccountRsn,
    setNewAccountRsn,
  } = props;

  return (
    <div className="dashboard-grid">
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
            <p className="muted-copy">
              No accounts yet. Add one to bring the dashboard to life.
            </p>
          ) : null}
          {accounts.map((account) => (
            <div className="list-row" key={account.id}>
              <div>
                <strong>{account.rsn}</strong>
                <p>{account.is_active ? "Active account" : "Inactive account"}</p>
              </div>
              <button
                className="ghost-button"
                onClick={() => onSyncAccount(account)}
                type="button"
              >
                {busyAction === `sync-${account.id}` ? "Syncing..." : "Sync"}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Next Actions"
        subtitle="Ranked directly from the recommendation engine."
      >
        <div className="stack-list">
          {nextActions ? (
            nextActions.actions.map((action) => (
              <div
                className="list-row action-row"
                key={`${action.action_type}-${action.title}`}
              >
                <div>
                  <strong>{action.title}</strong>
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
            <p className="muted-copy">No ranked actions available yet.</p>
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
            <div className="detail-card wide-card">
              <h3>Top skills</h3>
              <div className="chip-row">
                {selectedSnapshot.summary.top_skills?.map((skill) => (
                  <span className="chip" key={skill.skill}>
                    {skill.skill} {skill.level}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted-copy">
            Sync an account to see the enriched snapshot surface.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Goal Radar"
        subtitle={`Play style: ${profile?.play_style ?? "unknown"}`}
      >
        <div className="stack-list">
          {goals.length === 0 ? <p className="muted-copy">No goals created yet.</p> : null}
          {goals.slice(0, 4).map((goal) => (
            <div className="list-row" key={goal.id}>
              <div>
                <strong>{goal.title}</strong>
                <p>{goal.goal_type}</p>
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

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
