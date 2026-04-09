import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
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
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Advisor chamber // Live thread status
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-[3.6rem] font-black uppercase tracking-[0.12em] text-white md:text-[4.7rem]">
              Cerebro intelligence
            </h1>
          </div>
          <div className="flex gap-10 xl:gap-12">
            <div className="text-right">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-osrs-text-soft">Threads</p>
              <strong className="mt-1.5 block font-display text-[2.4rem] font-bold tracking-[-0.05em] text-white">
                {chatSessions.length}
              </strong>
            </div>
            <div className="text-right">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-osrs-text-soft">Focus</p>
              <strong className="mt-1.5 block font-display text-[2rem] font-bold uppercase tracking-[-0.03em] text-white">
                {focusLabel}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.65fr)_24rem]">
        <section className="space-y-8">
          <div className="border border-white/8 bg-[#101010]">
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white">Cerebro assistant</p>
            </div>
            <div className="space-y-0">
              <div className="border-b border-white/8 px-5 py-5">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">System</p>
                <p className="mt-3 text-[0.92rem] leading-7 text-osrs-text-soft">
                  {selectedSession
                    ? `Thread anchored on ${threadAccountLabel}. Cerebro is currently reading this lane as ${intentLabel.toLowerCase()}.`
                    : `Ask about ${threadAccountLabel} and Cerebro will build a grounded OSRS thread from live account context.`}
                </p>
              </div>
              <div className="max-h-[32rem] min-h-[24rem] space-y-4 overflow-y-auto px-5 py-5">
                {visibleHistory.length > 0 ? (
                  visibleHistory.map((exchange) => (
                    <div className="space-y-4" key={`${exchange.sessionId}-${exchange.prompt}`}>
                      <div className="ml-auto max-w-[82%] rounded-[14px] border border-white/8 bg-[#151816] px-4 py-3">
                        <p className="mb-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-text-soft">You</p>
                        <p className="text-sm leading-7 text-osrs-text-soft">{exchange.prompt}</p>
                      </div>
                      <div className="max-w-[86%] rounded-[14px] border border-white/8 bg-[#121212] px-4 py-3">
                        <p className="mb-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Cerebro</p>
                        <p className="text-sm leading-7 text-osrs-text-soft">{exchange.reply}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
                    {chatReply || "No thread history yet. Start with a direct question and Cerebro will begin building context here."}
                  </div>
                )}
                <div ref={conversationEndRef} />
              </div>
              <div className="border-t border-white/8 px-5 py-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className="w-full border-0 bg-transparent px-0 py-0 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55"
                    onChange={(event) => setChatPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onRunChatPrompt();
                      }
                    }}
                    placeholder="Query account data..."
                    value={chatPrompt}
                  />
                  <Button className="md:min-w-[12rem]" onClick={() => onRunChatPrompt()}>
                    {busyAction === "chat" ? "Thinking..." : "Ask Cerebro"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-5">
            <div className="flex items-center gap-4">
              <p className="font-display text-[0.82rem] font-semibold uppercase tracking-[0.3em] text-white">Prompt lanes</p>
              <div className="h-px flex-1 bg-white/8" />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {advisorCapabilities.map((capability) => (
                <div className="border border-white/8 bg-[#101010] p-4" key={capability.title}>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">{capability.eyebrow}</p>
                  <h3 className="mt-3 font-display text-[1.15rem] font-bold uppercase leading-tight text-white">
                    {capability.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{capability.description}</p>
                  <div className="mt-4 grid gap-2">
                    {capability.prompts.slice(0, 3).map((prompt) => (
                      <button
                        className="rounded-[10px] border border-white/8 bg-[#131313] px-3 py-3 text-left text-sm leading-6 text-osrs-text-soft transition-colors hover:border-osrs-gold/45 hover:text-white"
                        key={prompt}
                        onClick={() => onRunChatPrompt(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="border border-white/8 bg-[#101010]">
            <div className="border-b border-white/8 px-5 py-4">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white">Thread telemetry</p>
            </div>
            <div className="space-y-4 px-5 py-5 text-sm text-osrs-text-soft">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Account</p>
                <p className="mt-2 font-display text-[1.2rem] uppercase text-white">{threadAccountLabel}</p>
              </div>
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Focus</p>
                <p className="mt-2 font-display text-[1.2rem] uppercase text-white">{focusLabel}</p>
              </div>
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Priority</p>
                <p className="mt-2 font-display text-[1.2rem] uppercase text-white">{intentLabel}</p>
              </div>
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Best next move</p>
                <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{threadNextMove.body}</p>
              </div>
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010]">
            <div className="border-b border-white/8 px-5 py-4">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white">Conversation threads</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              {chatSessions.length === 0 ? (
                <p className="text-sm leading-6 text-osrs-text-soft">No sessions yet.</p>
              ) : null}
              {chatSessions.map((session) => {
                const sessionState = normalizeSessionState(session.session_state);
                return (
                  <button
                    className={`w-full border px-4 py-3 text-left ${
                      selectedChatSessionId === session.id
                        ? "border-osrs-gold/40 bg-white/[0.03]"
                        : "border-white/8 bg-[#131313]"
                    }`}
                    key={session.id}
                    onClick={() => setSelectedChatSessionId(session.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="block font-display text-base uppercase text-white">{session.title}</strong>
                      <span
                        className={`rounded-full border px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] ${getIntentBadgeClass(
                          sessionState,
                        )}`}
                      >
                        {describeSessionIntent(sessionState)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{describeSessionPreview(sessionState)}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010] px-5 py-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Current blockers</p>
            <div className="mt-4 space-y-2">
              {threadBlockers.length > 0 ? (
                threadBlockers.map((blocker) => (
                  <div className="border border-white/8 bg-[#131313] px-3 py-3 text-sm text-osrs-text-soft" key={blocker}>
                    {blocker}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-osrs-text-soft">
                  No hard blockers are dominating this thread yet.
                </p>
              )}
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010] px-5 py-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Quick prompts</p>
            <div className="mt-4 grid gap-2">
              {quickPrompts.slice(0, 4).map((prompt) => (
                <button
                  className="border border-white/8 bg-[#131313] px-3 py-3 text-left text-sm leading-6 text-osrs-text-soft transition-colors hover:border-osrs-gold/45 hover:text-white"
                  key={prompt}
                  onClick={() => onRunChatPrompt(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        </aside>
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
    prompts.push("What kind of win would make me want to log in again tomorrow?");
    prompts.push("What would make tomorrow's session better?");
    prompts.push("What kind of session would build confidence on this account right now?");
    prompts.push("What habit would make this account easier to maintain over time?");
    prompts.push("What would keep this account from feeling stale right now?");
    prompts.push("What would make this account easier to return to after a break?");
    prompts.push("What should I preserve about this account right now?");
    prompts.push("What would make this account feel more coherent right now?");
    prompts.push("What part of the account needs protecting from drift?");
    prompts.push("What kind of session would reinforce this account's identity?");
    prompts.push("What one cleanup task would make everything feel more connected?");
    prompts.push("What would make this account feel more resilient?");
    prompts.push("What kind of play pattern is likely to burn out this account?");
    prompts.push("What one habit would keep progress compounding without making the game feel like work?");
    prompts.push("What kind of goal would fit this account without distorting it?");
    prompts.push("What kind of upgrade would feel exciting instead of obligatory?");
    prompts.push("What kind of progress would keep this account feeling alive over the next week?");
    prompts.push("What kind of milestone would feel genuinely worth chasing next?");
    prompts.push("What kind of grind is too dry for this account right now?");
    prompts.push("What kind of progress would make the next login feel obvious instead of uncertain?");
    prompts.push("What would make this account feel more premium or unlocked?");
    prompts.push("What kind of task is secretly too early even if it looks tempting?");
    prompts.push("What kind of progress would make this account feel less awkward and more complete?");
    prompts.push("What kind of progress would make this account feel more prestigious?");
    prompts.push("What kind of task is flashy but low real value right now?");
    prompts.push("What one improvement would make the account feel most transformed?");
    prompts.push("What kind of progress would make this account feel more self sufficient?");
    prompts.push("What kind of habit would make the account feel more premium over a month?");
    prompts.push("What one unlock would make the account feel dramatically more open?");
    prompts.push("What kind of progress would make the account feel more elite without becoming joyless?");
    prompts.push("What kind of habit would quietly waste the account's potential?");
    prompts.push("What one improvement would make the account feel dramatically more future proof?");
    prompts.push("What one change would reduce friction across the whole account?");
    prompts.push("What part of this account is quietly carrying everything?");
    prompts.push("What would make this account feel more legendary without becoming tedious?");
    prompts.push("What kind of progress would make this account feel calmer and easier to manage?");
    prompts.push("What part of this account looks impressive but is doing less than it seems?");
    prompts.push("What one unlock would make the account feel more effortless day to day?");
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
          "What kind of win would make me want to log in again tomorrow?",
          "What would make tomorrow's session better?",
          "What kind of session would build confidence on this account right now?",
          "What habit would make this account easier to maintain over time?",
          "What would keep this account from feeling stale right now?",
          "What would make this account easier to return to after a break?",
          "What should I preserve about this account right now?",
          "What would make this account feel more coherent right now?",
          "What part of the account needs protecting from drift?",
          "What kind of session would reinforce this account's identity?",
          "What one cleanup task would make everything feel more connected?",
          "What would make this account feel more resilient?",
          "What kind of play pattern is likely to burn out this account?",
          "What one habit would keep progress compounding without making the game feel like work?",
          "What kind of goal would fit this account without distorting it?",
          "What kind of upgrade would feel exciting instead of obligatory?",
          "What kind of progress would keep this account feeling alive over the next week?",
          "What kind of milestone would feel genuinely worth chasing next?",
          "What kind of grind is too dry for this account right now?",
          "What kind of progress would make the next login feel obvious instead of uncertain?",
          "What would make this account feel more premium or unlocked?",
          "What kind of task is secretly too early even if it looks tempting?",
          "What kind of progress would make this account feel less awkward and more complete?",
          "What kind of progress would make this account feel more prestigious?",
          "What kind of task is flashy but low real value right now?",
          "What one improvement would make the account feel most transformed?",
          "What kind of progress would make this account feel more self sufficient?",
          "What kind of habit would make the account feel more premium over a month?",
          "What one unlock would make the account feel dramatically more open?",
          "What kind of progress would make the account feel more elite without becoming joyless?",
          "What kind of habit would quietly waste the account's potential?",
          "What one improvement would make the account feel dramatically more future proof?",
          "What one change would reduce friction across the whole account?",
          "What part of this account is quietly carrying everything?",
          "What would make this account feel more legendary without becoming tedious?",
          "What kind of progress would make this account feel calmer and easier to manage?",
          "What part of this account looks impressive but is doing less than it seems?",
          "What one unlock would make the account feel more effortless day to day?",
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
