import type {
  Account,
  AccountSnapshot,
  ChatReply,
  ChatSession,
  Goal,
  NextActionResponse,
  Profile,
  QuestSummary,
  SkillCatalogItem,
  SkillRecommendationResponse,
} from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed." }));
    throw new Error(body.detail ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getProfile: () => request<Profile>("/profile"),
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
    request<{
      goal_id: number;
      status: string;
      summary: string;
      steps: string[];
      recommendations: Record<string, unknown>;
      context: Record<string, unknown>;
    }>(`/goals/${goalId}/plan`, {
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
};
