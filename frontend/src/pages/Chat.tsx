import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { ChatExchange, ChatSession } from "../types";

type ChatViewProps = {
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
};

export function ChatView({
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
}: ChatViewProps) {
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const selectedSession =
    chatSessions.find((session) => session.id === selectedChatSessionId) ?? chatSessions[0] ?? null;
  const sessionState = normalizeSessionState(selectedSession?.session_state);
  const focusLabel = describeSessionFocus(sessionState);
  const intentLabel = describeSessionIntent(sessionState);
  const threadAccountLabel =
    readStateString(sessionState, "last_account_rsn") ?? selectedAccountRsn ?? "No account anchored yet";
  const threadNextMove = describeThreadNextMove(sessionState);
  const threadBlockers = readStateStringArray(sessionState, "last_blockers");
  const visibleHistory =
    selectedChatSessionId === null
      ? chatHistory
      : chatHistory.filter((exchange) => exchange.sessionId === selectedChatSessionId);
  const quickPrompts = buildQuickPrompts(sessionState, selectedAccountRsn);
  const advisorCapabilities = buildAdvisorCapabilities(sessionState);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedChatSessionId, visibleHistory.length]);

  return (
    <div className="space-y-6">
      <PageHero
        chips={[
          { label: "Active account", value: threadAccountLabel },
          { label: "Open sessions", value: String(chatSessions.length) },
          { label: "Advisor mode", value: intentLabel },
        ]}
        description="Ask about your stats, routes, gear, boss prep, profit options, unlocks, or longer-term planning. Goals help when they are relevant, but they are not the only lane Cerebro can reason through."
        eyebrow="Advisor Chamber"
        title="Ask Cerebro from the center of the workspace"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 shadow-insetPanel">
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Account context</p>
            <p className="font-display text-lg text-osrs-text">{threadAccountLabel}</p>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 shadow-insetPanel">
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Thread focus</p>
            <p className="font-display text-lg text-osrs-text">{focusLabel}</p>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 shadow-insetPanel">
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Conversation mode</p>
            <p className="font-display text-lg text-osrs-text">{intentLabel}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
            onChange={(event) => setChatPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onRunChatPrompt();
              }
            }}
            placeholder="Ask about your account, task, route, boss prep, profit, or next move"
            value={chatPrompt}
          />
          <Button className="md:min-w-[12rem]" onClick={() => onRunChatPrompt()}>
            {busyAction === "chat" ? "Thinking..." : "Consult Advisor"}
          </Button>
        </div>
      </PageHero>

      <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <Panel className="space-y-3">
          <SectionHeader
            eyebrow="Quick prompts"
            title={selectedSession ? "Keep the thread moving" : "Start from a known question"}
            subtitle={
              selectedSession
                ? "These prompts shift with the current session so Cerebro can keep building on the same planning lane."
                : "Use a strong starter question and Cerebro will begin building a grounded thread from there."
            }
          />
          <div className="grid gap-2">
            {quickPrompts.map((prompt) => (
              <button
                className="cerebro-hover rounded-[14px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 text-left text-sm text-osrs-text-soft"
                key={prompt}
                onClick={() => onRunChatPrompt(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Latest reply"
            title="Conversation"
            subtitle="This is where the planner turns structured account intelligence into readable advice."
          />
          <div className="max-h-[70vh] min-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {visibleHistory.length > 0 ? (
              visibleHistory.map((exchange) => (
                <div className="space-y-3" key={`${exchange.sessionId}-${exchange.prompt}`}>
                  <div className="ml-auto max-w-[80%] rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(33,51,43,0.72),rgba(22,28,24,0.94))] px-4 py-3 shadow-insetPanel">
                    <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">You</p>
                    <p className="text-sm leading-7 text-osrs-text-soft">{exchange.prompt}</p>
                  </div>
                  <div className="max-w-[88%] rounded-[18px] border border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(58,45,31,0.88),rgba(30,24,18,0.98))] px-4 py-3 shadow-insetPanel">
                    <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Advisor</p>
                    <p className="text-sm leading-7 text-osrs-text-soft">{exchange.reply}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
                {chatReply || "No session history yet. Start with a quick prompt and Cerebro will begin building conversation context here."}
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Session list"
            title="Conversation threads"
            subtitle="Switch sessions to keep different planning threads separate."
          />
          <div className="grid gap-2">
            {chatSessions.length === 0 ? (
              <p className="text-sm leading-6 text-osrs-text-soft">No sessions yet.</p>
            ) : null}
            {chatSessions.map((session) => {
              const sessionState = normalizeSessionState(session.session_state);
              return (
                <button
                  className={`cerebro-hover rounded-[14px] border px-4 py-3 text-left ${
                    selectedChatSessionId === session.id
                      ? "border-osrs-border-light/80 bg-[linear-gradient(135deg,rgba(200,164,90,0.22),rgba(58,47,38,0.12))] shadow-glowGold"
                      : "border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))]"
                  }`}
                  key={session.id}
                  onClick={() => setSelectedChatSessionId(session.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="block font-display text-base text-osrs-text">{session.title}</strong>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${getIntentBadgeClass(
                        sessionState,
                      )}`}
                    >
                      {describeSessionIntent(sessionState)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-osrs-border/80 bg-osrs-bg-soft/70 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-osrs-gold-soft">
                      {describeSessionFocus(sessionState)}
                    </span>
                    <span className="rounded-full border border-osrs-border/80 bg-osrs-bg-soft/70 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-osrs-text-soft">
                      {describeSessionMode(sessionState)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                    {describeSessionPreview(sessionState)}
                  </p>
                  {readStateString(sessionState, "last_goal_title") ? (
                    <p className="mt-2 text-xs leading-5 text-osrs-text-soft">
                      Goal: {readStateString(sessionState, "last_goal_title")}
                    </p>
                  ) : null}
                  <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-osrs-text-soft">
                    Updated {new Date(session.updated_at).toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {advisorCapabilities.map((capability) => (
          <Panel className="space-y-3" key={capability.title}>
            <SectionHeader eyebrow={capability.eyebrow} title={capability.title} subtitle={capability.description} />
            <div className="grid gap-2">
              {capability.prompts.map((prompt) => (
                <button
                  className="cerebro-hover rounded-[14px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 text-left text-sm text-osrs-text-soft"
                  key={prompt}
                  onClick={() => onRunChatPrompt(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="space-y-2">
          <SectionHeader eyebrow="Thread account" title={threadAccountLabel} />
          <p className="text-sm leading-6 text-osrs-text-soft">
            Cerebro anchors direct stat, gear, route, and sync questions against this account when possible.
          </p>
        </Panel>
        <Panel className="space-y-2">
          <SectionHeader eyebrow="Current lane" title={focusLabel} />
          <p className="text-sm leading-6 text-osrs-text-soft">
            This is the main subject Cerebro thinks the current thread is orbiting right now.
          </p>
        </Panel>
        <Panel className="space-y-2">
          <SectionHeader eyebrow="Current priority" title={intentLabel} />
          <p className="text-sm leading-6 text-osrs-text-soft">
            Cerebro is using this planning intent to shape comparisons, follow-ups, and what it deprioritizes.
          </p>
        </Panel>
        <Panel className="space-y-2">
          <SectionHeader eyebrow="Best next move" title={threadNextMove.title} />
          <p className="text-sm leading-6 text-osrs-text-soft">{threadNextMove.body}</p>
        </Panel>
        <Panel className="space-y-2">
          <SectionHeader
            eyebrow="Current blockers"
            title={threadBlockers.length > 0 ? threadBlockers[0] : "No hard blockers tracked"}
          />
          <div className="space-y-2">
            {threadBlockers.length > 0 ? (
              threadBlockers.map((blocker) => (
                <div
                  className="rounded-[12px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-3 py-2 text-sm text-osrs-text-soft"
                  key={blocker}
                >
                  {blocker}
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-osrs-text-soft">
                The current lane looks actionable. Ask Cerebro which blocker to clear first when a tighter route needs cleanup.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function normalizeSessionState(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function buildQuickPrompts(
  state: Record<string, unknown>,
  selectedAccountRsn: string | null,
): string[] {
  const prompts: string[] = [];
  const goalTitle = readStateString(state, "last_goal_title");
  const questId = readStateString(state, "last_quest_id");
  const bossId = readStateString(state, "last_boss_id");
  const moneyTarget = readStateString(state, "last_money_target");
  const destination = readStateString(state, "last_destination");
  const skill = readStateString(state, "last_recommended_skill");
  const gear = readStateString(state, "last_recommended_gear");
  const combatStyle = readStateString(state, "last_combat_style");
  const accountLabel = readStateString(state, "last_account_rsn") ?? selectedAccountRsn;

  if (goalTitle) {
    prompts.push(`What would move me closest to ${goalTitle} fastest?`);
  }

  if (questId) {
    const questLabel = humanizeLabel(questId);
    prompts.push(`What am I still missing for ${questLabel}?`);
    prompts.push(`What comes after ${questLabel}?`);
  }

  if (bossId) {
    prompts.push(`Am I actually ready for ${humanizeLabel(bossId)}?`);
  }

  if (moneyTarget) {
    prompts.push(`Is ${humanizeLabel(moneyTarget)} still my best money maker?`);
  }

  if (destination) {
    prompts.push(`What is the best route to ${humanizeLabel(destination)} right now?`);
  }

  if (skill) {
    prompts.push(`How should I train ${humanizeLabel(skill)} next?`);
  }

  if (gear) {
    prompts.push(`What should come after ${gear}?`);
  }

  if (combatStyle) {
    prompts.push(`What ${humanizeLabel(combatStyle)} upgrade should I push next?`);
  }

  if (accountLabel) {
    prompts.push(`What changed that matters most for ${accountLabel}?`);
  } else {
    prompts.push("What changed that matters most after sync?");
  }

    prompts.push("What should I do today if I want real progress?");
    prompts.push("What should I do if I want both profit and progression?");
    prompts.push("What area of my account am I neglecting right now?");
    prompts.push("What should I fix first on this account?");
    prompts.push("What part of my account is already in a good spot?");
    prompts.push("What part of my account am I overinvesting in?");
    prompts.push("What lane is most ready to capitalize on right now?");
    prompts.push("Am I more bottlenecked by unlocks or stats right now?");
    prompts.push("What gives the best mix of utility and momentum right now?");
    prompts.push("What lane is easiest to convert into real progress this week?");
    prompts.push("What lane loses value if I ignore it?");
    prompts.push("What part of my account is under leveraged right now?");
    prompts.push("What should I revisit after a few days?");
    prompts.push("What part of my account is quietly high leverage right now?");
    prompts.push("Where is the hidden opportunity on my account right now?");
    prompts.push("What kind of account is this becoming?");
    prompts.push("What playstyle does this account naturally support?");
    prompts.push("What content does this account look built for right now?");
    prompts.push("What kind of player would enjoy this account right now?");
    prompts.push("What content is one unlock away from opening up right now?");
    prompts.push("What content is safest to learn on this account right now?");
    prompts.push("What kind of progress loop fits this account best right now?");
    prompts.push("What would make this account feel smoother to play right now?");
    prompts.push("What routine fits this account best right now?");
    prompts.push("What would make this account feel more rewarding to play right now?");
    prompts.push("What kind of session fits this account best tonight?");
    prompts.push("What current strength is being wasted by a missing unlock?");
    prompts.push("What boring task would create disproportionate future value?");
    prompts.push("What lane is closest to compounding if I bridge one missing piece?");

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const prompt of prompts) {
    const normalized = prompt.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(prompt);
  }

  return deduped.slice(0, 6);
}

function buildAdvisorCapabilities(state: Record<string, unknown>): Array<{
  eyebrow: string;
  title: string;
  description: string;
  prompts: string[];
}> {
  const questId = readStateString(state, "last_quest_id");
  const bossId = readStateString(state, "last_boss_id");
  const skill = readStateString(state, "last_recommended_skill");
  const moneyTarget = readStateString(state, "last_money_target");

  const focusPrompt = questId
    ? `How would you sequence ${humanizeLabel(questId)} over the next few days?`
    : bossId
      ? `How would you sequence prep for ${humanizeLabel(bossId)} over the next few days?`
      : "How would you sequence this over the next few days?";

  const tradeoffPrompt = skill
    ? `What should I prioritize if I care more about XP than unlocks?`
    : moneyTarget
      ? `What should I do if I want both profit and progression?`
      : "What's the tradeoff?";

  return [
    {
      eyebrow: "Account read",
      title: "Ask for an account readout",
      description: "Use these when you want Cerebro to read the account itself instead of jumping straight into a goal lane.",
        prompts: [
          "What stands out about my account right now?",
          "How balanced is my account right now?",
          "What area of my account am I neglecting right now?",
          "What should I fix first on this account?",
          "What part of my account is already in a good spot?",
          "What part of my account am I overinvesting in?",
          "What lane is most ready to capitalize on right now?",
          "Am I more bottlenecked by unlocks or stats right now?",
          "What gives the best mix of utility and momentum right now?",
          "What lane is easiest to convert into real progress this week?",
          "What lane loses value if I ignore it?",
          "What part of my account is under leveraged right now?",
          "What should I revisit after a few days?",
          "What part of my account is quietly high leverage right now?",
          "Where is the hidden opportunity on my account right now?",
          "What kind of account is this becoming?",
          "What playstyle does this account naturally support?",
          "What content does this account look built for right now?",
          "What kind of player would enjoy this account right now?",
          "What content is one unlock away from opening up right now?",
          "What content is safest to learn on this account right now?",
          "What kind of progress loop fits this account best right now?",
          "What would make this account feel smoother to play right now?",
          "What routine fits this account best right now?",
          "What would make this account feel more rewarding to play right now?",
          "What kind of session fits this account best tonight?",
          "What current strength is being wasted by a missing unlock?",
          "What boring task would create disproportionate future value?",
          "What lane is closest to compounding if I bridge one missing piece?",
          "What should I ask you about this account first?",
        ],
      },
    {
      eyebrow: "Planning coach",
      title: "Ask for sequencing",
      description: "Use Cerebro like a planner when you want a few days of direction instead of one isolated answer.",
      prompts: [
        focusPrompt,
        "What should I do today if I want real progress?",
        "What would unblock me fastest?",
        "What should I do this weekend?",
        "What should I have done by Sunday?",
        "What should I push if I want better money by this weekend?",
      ],
    },
    {
      eyebrow: "Tradeoff lens",
      title: "Ask for decisions",
      description: "These prompts are best when you want Cerebro to narrow choices and explain what you give up.",
      prompts: [
        "How confident are you in that?",
        "Why now instead of later?",
        tradeoffPrompt,
        "What are my three biggest blockers right now?",
        "Which blocker should I clear first?",
        "What small win should I lock in next?",
        "What unlock should I push next?",
        "Which unlock chain should I prioritize?",
        "Which money maker has the lowest unlock burden?",
      ],
    },
    {
      eyebrow: "Low-friction play",
      title: "Ask for lighter options",
      description: "Good for evenings when you still want useful momentum without committing to the hardest lane.",
      prompts: [
        "What should I do if I want something lower effort but still useful?",
        "I want AFK progress tonight. What should I do?",
        "Should I train Slayer or Fishing?",
        "What should I prep for Barrows?",
        "What low attention money maker should I do?",
        "What utility unlock should I push next?",
        "What diary-style utility unlock should I care about next?",
      ],
    },
  ];
}

function readStateString(state: Record<string, unknown>, key: string): string | null {
  const value = state[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readStateStringArray(state: Record<string, unknown>, key: string): string[] {
  const value = state[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function humanizeLabel(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function describeSessionFocus(state: Record<string, unknown>): string {
  const questId = readStateString(state, "last_quest_id");
  if (questId) {
    return humanizeLabel(questId);
  }

  const bossId = readStateString(state, "last_boss_id");
  if (bossId) {
    return humanizeLabel(bossId);
  }

  const moneyTarget = readStateString(state, "last_money_target");
  if (moneyTarget) {
    return humanizeLabel(moneyTarget);
  }

  const destination = readStateString(state, "last_destination");
  if (destination) {
    return `${humanizeLabel(destination)} route`;
  }

  const skill = readStateString(state, "last_recommended_skill");
  if (skill) {
    return `${humanizeLabel(skill)} training`;
  }

  const gear = readStateString(state, "last_recommended_gear");
  if (gear) {
    return gear;
  }

  const combatStyle = readStateString(state, "last_combat_style");
  if (combatStyle) {
    return `${humanizeLabel(combatStyle)} upgrades`;
  }

  return "No thread focus yet";
}

function describeSessionIntent(state: Record<string, unknown>): string {
  const intent = readStateString(state, "last_session_intent");
  if (!intent) {
    return "General guidance";
  }

  const labels: Record<string, string> = {
    profit: "Making money",
    travel: "Travel setup",
    bossing: "Boss readiness",
    questing: "Quest progression",
    gearing: "Gear upgrades",
    training: "Skill training",
    progression: "Overall progression",
  };

  return labels[intent] ?? humanizeLabel(intent);
}

function describeSessionMode(state: Record<string, unknown>): string {
  if (readStateString(state, "last_goal_title")) {
    return "Goal-led";
  }

  if (readStateString(state, "last_account_rsn")) {
    return "Account-led";
  }

  return "Open thread";
}

function describeSessionPreview(state: Record<string, unknown>): string {
  const questId = readStateString(state, "last_quest_id");
  if (questId) {
    return `Currently circling ${humanizeLabel(questId)} and the requirements around it.`;
  }

  const bossId = readStateString(state, "last_boss_id");
  if (bossId) {
    return `This thread is evaluating readiness and next steps for ${humanizeLabel(bossId)}.`;
  }

  const moneyTarget = readStateString(state, "last_money_target");
  if (moneyTarget) {
    return `Cerebro is weighing ${humanizeLabel(moneyTarget)} against your broader progression.`;
  }

  const destination = readStateString(state, "last_destination");
  if (destination) {
    return `Travel planning is anchored around the best route to ${humanizeLabel(destination)}.`;
  }

  const skill = readStateString(state, "last_recommended_skill");
  if (skill) {
    return `The current lane is training ${humanizeLabel(skill)} in a way that fits your account.`;
  }

  const goal = readStateString(state, "last_goal_title");
  if (goal) {
    return `This session is staying aligned to ${goal} as the active destination.`;
  }

  const account = readStateString(state, "last_account_rsn");
  if (account) {
    return `This thread is grounded in ${account}'s synced account context and planning state.`;
  }

  return "A flexible planning thread without a strongly established lane yet.";
}

function describeThreadNextMove(state: Record<string, unknown>): { title: string; body: string } {
  const questId = readStateString(state, "last_quest_id");
  if (questId) {
    const questLabel = humanizeLabel(questId);
    return {
      title: `Push ${questLabel}`,
      body: `Stay on ${questLabel} and use Cerebro to close the last blockers, requirements, or unlocks around it.`,
    };
  }

  const bossId = readStateString(state, "last_boss_id");
  if (bossId) {
    const bossLabel = humanizeLabel(bossId);
    return {
      title: `Prep for ${bossLabel}`,
      body: `Use this thread to tighten the skills, gear, and route setup that would make ${bossLabel} feel actually ready.`,
    };
  }

  const moneyTarget = readStateString(state, "last_money_target");
  if (moneyTarget) {
    const targetLabel = humanizeLabel(moneyTarget);
    return {
      title: `Run ${targetLabel}`,
      body: `Keep this lane centered on ${targetLabel} until Cerebro sees a better tradeoff between profit and progression.`,
    };
  }

  const destination = readStateString(state, "last_destination");
  if (destination) {
    const destinationLabel = humanizeLabel(destination);
    return {
      title: `Unlock the ${destinationLabel} route`,
      body: `Use the conversation to strip out friction and get the cleanest route to ${destinationLabel} online.`,
    };
  }

  const skill = readStateString(state, "last_recommended_skill");
  if (skill) {
    const skillLabel = humanizeLabel(skill);
    return {
      title: `Train ${skillLabel}`,
      body: `This thread is already leaning toward ${skillLabel}, so the highest-value move is to keep refining the training path instead of changing lanes.`,
    };
  }

  const gear = readStateString(state, "last_recommended_gear");
  if (gear) {
    return {
      title: `Push ${gear}`,
      body: `Cerebro sees ${gear} as the live upgrade lane, so the next move is to keep narrowing the path toward it.`,
    };
  }

  const combatStyle = readStateString(state, "last_combat_style");
  if (combatStyle) {
    const styleLabel = humanizeLabel(combatStyle);
    return {
      title: `${styleLabel} upgrades first`,
      body: `The conversation is already centered on ${styleLabel}, so Cerebro will get more useful if you keep pressure on that gear lane.`,
    };
  }

  const goal = readStateString(state, "last_goal_title");
  if (goal) {
    return {
      title: `Advance ${goal}`,
      body: `Your goal is already anchored, so the next useful move is to ask Cerebro for the fastest route, biggest blocker, or today's best push toward it.`,
    };
  }

  return {
    title: "Anchor the first strong lane",
    body: "Start with a concrete question about your next action, a goal, or a specific unlock so Cerebro can turn this into a real planning thread.",
  };
}

function getIntentBadgeClass(state: Record<string, unknown>): string {
  const intent = readStateString(state, "last_session_intent");

  switch (intent) {
    case "profit":
      return "border-emerald-600/50 bg-emerald-950/40 text-emerald-200";
    case "questing":
      return "border-amber-600/50 bg-amber-950/40 text-amber-100";
    case "bossing":
      return "border-rose-700/50 bg-rose-950/40 text-rose-100";
    case "training":
      return "border-sky-700/50 bg-sky-950/40 text-sky-100";
    case "gearing":
      return "border-violet-700/50 bg-violet-950/40 text-violet-100";
    case "travel":
      return "border-cyan-700/50 bg-cyan-950/40 text-cyan-100";
    case "progression":
      return "border-osrs-border-light/70 bg-[rgba(200,164,90,0.12)] text-osrs-gold-soft";
    default:
      return "border-osrs-border/80 bg-osrs-bg-soft/70 text-osrs-text-soft";
  }
}
