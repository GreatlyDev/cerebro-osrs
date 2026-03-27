export type Account = {
  id: number;
  rsn: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountSnapshot = {
  id: number;
  account_id: number;
  source: string;
  sync_status: string;
  created_at: string;
  summary: {
    rsn: string;
    overall_level: number;
    overall_rank: number;
    overall_experience: number;
    combat_level?: number;
    top_skills?: Array<{
      skill: string;
      level: number;
      experience: number;
    }>;
    progression_profile?: {
      highest_skill: string | null;
      lowest_tracked_skill: string | null;
      total_skills_at_99: number;
      total_skills_at_90_plus: number;
    };
    activity_overview?: {
      tracked_activity_count: number;
      active_activity_count: number;
    };
  };
};

export type Goal = {
  id: number;
  title: string;
  goal_type: string;
  target_account_rsn: string | null;
  status: string;
  notes: string | null;
  generated_plan: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type GoalPlanResponse = {
  goal_id: number;
  status: string;
  summary: string;
  steps: string[];
  recommendations: Record<string, unknown>;
  context: Record<string, unknown>;
};

export type Profile = {
  id: number;
  display_name: string;
  primary_account_rsn: string | null;
  play_style: string;
  goals_focus: string;
  prefers_afk_methods: boolean;
  prefers_profitable_methods: boolean;
  created_at: string;
  updated_at: string;
};

export type NextAction = {
  action_type: string;
  title: string;
  summary: string;
  score: number;
  priority: string;
  target: Record<string, unknown>;
  blockers: string[];
  supporting_data: Record<string, unknown>;
};

export type NextActionResponse = {
  account_rsn: string | null;
  goal_id: number | null;
  goal_title: string | null;
  top_action: NextAction | null;
  actions: NextAction[];
  context: Record<string, unknown>;
};

export type ChatSession = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatReply = {
  session_id: number;
  user_message: {
    id: number;
    role: string;
    content: string;
    created_at: string;
  };
  assistant_message: {
    id: number;
    role: string;
    content: string;
    created_at: string;
  };
};

export type SkillCatalogItem = {
  key: string;
  label: string;
  category: string;
};

export type SkillRecommendationResponse = {
  skill: string;
  account_rsn: string | null;
  preference: string;
  current_level: number | null;
  recommendations: Array<{
    method: string;
    preference: string;
    min_level: number;
    max_level: number;
    estimated_xp_rate: string;
    requirements: string[];
    rationale: string;
    tags: string[];
  }>;
  context: Record<string, unknown>;
};

export type QuestSummary = {
  id: string;
  name: string;
  difficulty: string;
  category: string;
  recommendation_reason: string;
};
