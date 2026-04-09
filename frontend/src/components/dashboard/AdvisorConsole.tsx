import type { ChatExchange } from "../../types";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type AdvisorConsoleProps = {
  chatHistory: ChatExchange[];
  chatPrompt: string;
  chatReply: string;
  onOpenAdvisor: () => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  quickPrompts: string[];
  onRunQuickPrompt: (prompt: string) => void;
  busy: boolean;
};

function MessageBubble(props: { role: "user" | "advisor"; content: string }) {
  const tone =
    props.role === "advisor"
      ? "ml-0 border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(58,45,31,0.88),rgba(30,24,18,0.98))]"
      : "ml-auto border-osrs-border/70 bg-[linear-gradient(180deg,rgba(33,51,43,0.72),rgba(22,28,24,0.94))]";

  return (
    <div className={`max-w-[85%] rounded-[18px] border px-4 py-3 shadow-insetPanel ${tone}`}>
      <p className="mb-1 text-[0.68rem] uppercase tracking-[0.2em] text-osrs-gold">
        {props.role === "advisor" ? "Advisor" : "You"}
      </p>
      <p className="text-sm leading-6 text-osrs-text-soft">{props.content}</p>
    </div>
  );
}

export function AdvisorConsole({
  chatHistory,
  chatPrompt,
  chatReply,
  onOpenAdvisor,
  onPromptChange,
  onSubmit,
  quickPrompts,
  onRunQuickPrompt,
  busy,
}: AdvisorConsoleProps) {
  const latestMessages = chatHistory.slice(-2).flatMap((exchange) => [
    { role: "user" as const, content: exchange.prompt },
    { role: "advisor" as const, content: exchange.reply },
  ]);

  const messages =
    latestMessages.length > 0
      ? latestMessages
      : [
          {
            role: "advisor" as const,
            content:
              chatReply || "Ask Cerebro about your next best action, a quest gate, or where the account is losing momentum.",
          },
        ];

  return (
    <Panel className="space-y-4 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(15,13,11,0.98))]" tone="soft">
      <SectionHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-osrs-success/25 bg-osrs-success/8 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text">
              <span className="h-2 w-2 rounded-full bg-osrs-success" />
              Advisor online
            </div>
            <Button onClick={onOpenAdvisor} variant="secondary">
              Open full advisor
            </Button>
          </div>
        }
        eyebrow="Advisor Console"
        subtitle="A premium chat surface over live account telemetry. Cerebro should feel useful for direct questions, practical OSRS decisions, and broader account reads before any goal planning takes over."
        title="Consult Cerebro"
      />

      <div className="rounded-[20px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.32))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Quick prompts</span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="cerebro-hover rounded-full border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.28))] px-3 py-2 text-left text-sm text-osrs-text-soft"
              onClick={() => onRunQuickPrompt(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-4 rounded-[22px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(15,13,11,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3 border-b border-osrs-border/60 pb-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Conversation feed</p>
              <p className="mt-1 text-sm text-osrs-text-soft">Cerebro keeps the latest planning exchange centered here.</p>
            </div>
            <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/65 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-osrs-text-soft">
              {messages.length} messages
            </span>
          </div>

          <div className="cerebro-stagger space-y-3 min-h-[12rem]">
            {messages.map((message, index) => (
              <MessageBubble content={message.content} key={`${message.role}-${index}`} role={message.role} />
            ))}
          </div>
          <div className="grid gap-3 border-t border-osrs-border/60 pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="rounded-[14px] border border-osrs-border/50 bg-[#101210] px-4 py-3 text-sm text-osrs-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="Ask about training, unlocks, routes, or what changed since the last sync"
              value={chatPrompt}
            />
            <Button className="md:min-w-[11rem]" onClick={onSubmit}>
              {busy ? "Consulting..." : "Consult Advisor"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.34))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">What this is best at</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-osrs-text-soft">
              <li>- answering direct account and stat questions without needing a goal first</li>
              <li>- comparing routes, upgrades, profit lanes, and boss prep in practical terms</li>
              <li>- turning sync changes and blockers into useful next moves</li>
            </ul>
          </div>
          <div className="rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.34))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current mode</p>
            <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
              Live account and planner context. Cerebro can use goal state when it helps, but it should still answer broader OSRS questions even when the thread is not goal-driven.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
