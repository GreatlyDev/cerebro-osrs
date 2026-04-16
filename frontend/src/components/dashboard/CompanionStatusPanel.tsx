import { useEffect, useState } from "react";

import { api } from "../../api";
import type { Account } from "../../types";
import { Button } from "../ui/Button";

// Local test flow requirement:
// After generating a plugin link code, the UI should point the tester at
// companion/runelite-plugin/scripts/run-cerebro-companion.bat
// so the website and plugin setup feel like one coherent flow.

type CompanionStatusPanelProps = {
  selectedAccount: Account | null;
  onRefreshStatus?: () => Promise<void> | void;
};

function formatCompanionStatus(value: string | null): string {
  if (!value) {
    return "Not linked";
  }

  return value.replaceAll("_", " ");
}

function formatTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CompanionStatusPanel({ selectedAccount, onRefreshStatus }: CompanionStatusPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    setLinkToken(null);
    setExpiresAt(null);
    setError(null);
  }, [selectedAccount?.id]);

  useEffect(() => {
    if (!selectedAccount || !onRefreshStatus) {
      return;
    }

    const refresh = () => {
      void onRefreshStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onRefreshStatus, selectedAccount]);

  const isLinked = selectedAccount?.companion_status === "linked";
  const awarenessCopy = selectedAccount
    ? `Connect the RuneLite companion to ${selectedAccount.rsn} to sync quests, diaries, travel unlocks, and gear-aware state into the same telemetry Cerebro already reads.`
    : "Select an account first, then generate a short-lived plugin link code to bring RuneLite companion awareness into this workspace.";

  async function handleCreateLinkSession() {
    if (!selectedAccount) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const session = await api.createCompanionLinkSession(selectedAccount.id);
      setLinkToken(session.link_token);
      setExpiresAt(session.expires_at);
      await onRefreshStatus?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create a companion link code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-white/8 bg-[#101010]">
      <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-osrs-gold">RuneLite companion</p>
          <h3 className="mt-2 font-display text-[1.05rem] font-bold uppercase tracking-[0.08em] text-white">
            {isLinked ? "Companion linked" : "Add deeper account awareness"}
          </h3>
        </div>
        <span
          className={`inline-flex border px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] ${
            isLinked
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-white/8 bg-[#0c0c0c] text-osrs-text-soft"
          }`}
        >
          {selectedAccount ? formatCompanionStatus(selectedAccount.companion_status) : "Awaiting account"}
        </span>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border border-white/8 bg-[#0c0c0c] px-4 py-4">
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.22em] text-osrs-text-soft">Selected account</p>
            <p className="mt-2 font-display text-[1.02rem] font-bold uppercase text-white">
              {selectedAccount?.rsn ?? "No account selected"}
            </p>
          </div>
          <div className="border border-white/8 bg-[#0c0c0c] px-4 py-4">
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.22em] text-osrs-text-soft">Status</p>
            <p className="mt-2 font-display text-[1.02rem] font-bold uppercase text-white">
              {selectedAccount ? formatCompanionStatus(selectedAccount.companion_status) : "Standby"}
            </p>
          </div>
          <div className="border border-white/8 bg-[#0c0c0c] px-4 py-4">
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.22em] text-osrs-text-soft">Last sync</p>
            <p className="mt-2 font-display text-[1.02rem] font-bold uppercase text-white">
              {formatTimestamp(selectedAccount?.companion_last_synced_at ?? null) ?? "No companion sync yet"}
            </p>
          </div>
        </div>

        <p className="text-sm leading-7 text-osrs-text-soft">{awarenessCopy}</p>

        <div className="space-y-3">
          <Button disabled={busy || !selectedAccount} onClick={handleCreateLinkSession}>
            {busy ? "Creating link code..." : "Create plugin link code"}
          </Button>

          {linkToken ? (
            <div className="border border-osrs-gold/28 bg-[#0b0b0b] px-4 py-4">
              <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-osrs-gold">Plugin link code</p>
              <pre className="mt-3 overflow-x-auto font-mono text-sm leading-6 text-white">{linkToken}</pre>
              <p className="mt-3 text-xs leading-6 text-osrs-text-soft">
                Enter this in the RuneLite companion plugin{expiresAt ? ` before ${formatTimestamp(expiresAt)}` : ""}.
              </p>
              <p className="mt-2 text-xs leading-6 text-osrs-text-soft">
                For local Windows testing, start the companion from
                <code className="mx-1 font-mono text-[0.72rem]">
                  companion\runelite-plugin\scripts\run-cerebro-companion.bat
                </code>
                after your backend is running.
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm leading-6 text-red-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
