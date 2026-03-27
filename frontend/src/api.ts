import type {
  Account,
  AccountSnapshot,
  AuthSession,
  AuthUser,
  ChatReply,
  ChatSession,
  GearRecommendationResponse,
  Goal,
  GoalPlanResponse,
  HealthCheck,
  NextActionResponse,
  Profile,
  ProfileUpdate,
  QuestDetail,
  QuestSummary,
  SkillCatalogItem,
  SkillRecommendationResponse,
  TeleportRouteResponse,
} from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
const SESSION_TOKEN_KEY = "cerebro.sessionToken";

function getSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function storeSessionToken(sessionToken: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (sessionToken === null) {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const target = path.startsWith("http")
    ? path
    : path.startsWith("/health")
      ? `${API_BASE_URL.replace(/\/api$/, "")}${path}`
      : `${API_BASE_URL}${path}`;
  const headers = new Headers(init?.headers);
  const sessionToken = getSessionToken();

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (sessionToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  const response = await fetch(target, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed." }));
    throw new Error(body.detail ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<HealthCheck>("/health"),
  getSession: () => request<AuthUser>("/auth/session"),
  devLogin: (payload: { email: string; display_name?: string | null }) =>
    request<AuthSession>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getProfile: () => request<Profile>("/profile"),
  updateProfile: (payload: ProfileUpdate) =>
    request<Profile>("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  listAccounts: () => request<{ items: Account[]; total: number }>("/accounts"),
  createAccount: (rsn: string) =>
    request<Account>("/accounts", {
      method: "POST",
      body: JSON.stringify({ rsn }),
    }),
  syncAccount: (accountId: number) =>
    request<{ account_id: number; status: string; detail: string; snapshot_id: number }>(
      `/accounts/${accountId}/sync`,
      {
        method: "POST",
      },
    ),
  getAccountSnapshot: (accountId: number) =>
    request<AccountSnapshot>(`/accounts/${accountId}/snapshot`),
  listGoals: () => request<{ items: Goal[]; total: number }>("/goals"),
  createGoal: (payload: {
    title: string;
    goal_type: string;
    target_account_rsn?: string | null;
    notes?: string | null;
  }) =>
    request<Goal>("/goals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateGoalPlan: (goalId: number) =>
    request<GoalPlanResponse>(`/goals/${goalId}/plan`, {
      method: "POST",
    }),
  getNextActions: (params?: { goalId?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.goalId) {
      search.set("goal_id", String(params.goalId));
    }
    if (params?.limit) {
      search.set("limit", String(params.limit));
    }
    const query = search.toString();
    return request<NextActionResponse>(
      `/recommendations/next-actions${query ? `?${query}` : ""}`,
    );
  },
  listChatSessions: () => request<{ items: ChatSession[]; total: number }>("/chat/sessions"),
  createChatSession: (title: string) =>
    request<ChatSession>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  sendChatMessage: (sessionId: number, content: string) =>
    request<ChatReply>(`/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  listSkills: () => request<{ items: SkillCatalogItem[]; total: number }>("/skills"),
  getSkillRecommendations: (skill: string, accountRsn?: string | null) => {
    const search = new URLSearchParams();
    if (accountRsn) {
      search.set("account_rsn", accountRsn);
    }
    const query = search.toString();
    return request<SkillRecommendationResponse>(
      `/skills/${skill}/recommendations${query ? `?${query}` : ""}`,
    );
  },
  listQuests: () => request<{ items: QuestSummary[]; total: number }>("/quests"),
  getQuest: (questId: string) => request<QuestDetail>(`/quests/${questId}`),
  getGearRecommendations: (payload: {
    combat_style: string;
    budget_tier: string;
    current_gear: string[];
    account_rsn?: string | null;
  }) =>
    request<GearRecommendationResponse>("/gear/recommendations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getTeleportRoute: (payload: {
    destination: string;
    account_rsn?: string | null;
    preference?: string | null;
  }) =>
    request<TeleportRouteResponse>("/teleports/route", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
