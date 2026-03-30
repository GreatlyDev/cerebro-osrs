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
  const sessionState = selectedSession?.session_state ?? {};
  const focusLabel = describeSessionFocus(sessionState);
  const intentLabel = describeSessionIntent(sessionState);
  const goalLabel = readStateString(sessionState, "last_goal_title") ?? "No active goal in thread yet";
  const visibleHistory =
    selectedChatSessionId === null
      ? chatHistory
      : chatHistory.filter((exchange) => exchange.sessionId === selectedChatSessionId);

  const quickPrompts = [
    "What's my next best action?",
    "Which quest should I do for barrows gloves?",
    "What skill should I train next?",
    "What changed since my last sync?",
  ];

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedChatSessionId, visibleHistory.length]);

  return (
    <div className="space-y-6">
      <PageHero
        chips={[
          { label: "Active account", value: selectedAccountRsn ?? "None selected" },
          { label: "Open sessions", value: String(chatSessions.length) },
          { label: "Thread focus", value: focusLabel },
        ]}
        description="Use the advisor chamber when you want Cerebro to translate synced account context, planner momentum, and ranked actions into grounded OSRS guidance."
        eyebrow="Advisor Chamber"
        title="Ask Cerebro from the center of the workspace"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 shadow-insetPanel">
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current focus</p>
            <p className="font-display text-lg text-osrs-text">{focusLabel}</p>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 shadow-insetPanel">
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current priority</p>
            <p className="font-display text-lg text-osrs-text">{intentLabel}</p>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-4 py-3 shadow-insetPanel">
            <p className="mb-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Goal in thread</p>
            <p className="font-display text-lg text-osrs-text">{goalLabel}</p>
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
            placeholder="Ask Cerebro anything about your account"
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
            title="Start from a known question"
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
            {chatSessions.map((session) => (
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
                <strong className="block font-display text-base text-osrs-text">{session.title}</strong>
                <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-osrs-text-soft">
                  Updated {new Date(session.updated_at).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function readStateString(state: Record<string, unknown>, key: string): string | null {
  const value = state[key];
  return typeof value === "string" && value.trim() ? value : null;
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
