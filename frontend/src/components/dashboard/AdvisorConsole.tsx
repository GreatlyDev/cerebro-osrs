import type { ChatExchange } from "../../types";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type AdvisorConsoleProps = {
  chatHistory: ChatExchange[];
  chatPrompt: string;
  chatReply: string;
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
    <Panel className="space-y-5" tone="hero">
      <SectionHeader
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-osrs-success/35 bg-osrs-success/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text">
            <span className="h-2 w-2 rounded-full bg-osrs-success animate-drift" />
            Advisor online
          </div>
        }
        eyebrow="Advisor Console"
        subtitle="A premium chat surface over the live planner, with enough OSRS flavor to feel in-world without drifting into parody."
        title="Consult Cerebro"
      />

      <div className="rounded-[20px] border border-osrs-border/70 bg-osrs-panel-2/35 p-4 shadow-insetPanel">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Quick prompts</span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="cerebro-hover rounded-full border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-3 py-2 text-left text-sm text-osrs-text-soft"
              onClick={() => onRunQuickPrompt(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4 rounded-[22px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(28,22,17,0.92),rgba(16,13,11,0.98))] p-4 shadow-insetPanel">
          <div className="flex items-center justify-between gap-3 border-b border-osrs-border/60 pb-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Conversation feed</p>
              <p className="mt-1 text-sm text-osrs-text-soft">Cerebro keeps the latest planning exchange centered here.</p>
            </div>
            <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/65 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-osrs-text-soft">
              {messages.length} messages
            </span>
          </div>

          <div className="space-y-3">
            {messages.map((message, index) => (
              <MessageBubble content={message.content} key={`${message.role}-${index}`} role={message.role} />
            ))}
          </div>
          <div className="grid gap-3 border-t border-osrs-border/60 pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
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
          <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(60,46,30,0.62),rgba(24,19,15,0.96))] p-4 shadow-insetPanel">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">What this is best at</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-osrs-text-soft">
              <li>- translating ranked actions into readable next steps</li>
              <li>- calling out blockers before you waste a session</li>
              <li>- turning sync changes into practical advice</li>
            </ul>
          </div>
          <div className="rounded-[18px] border border-osrs-border/70 bg-osrs-panel-2/55 p-4 shadow-insetPanel">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current mode</p>
            <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
              Planner-grounded responses only. The advisor is reading real account and recommendation context, not free-floating mock chat.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
