import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import type { Account, Profile } from "../types";

type ProfileDraft = {
  display_name: string;
  primary_account_rsn: string;
  play_style: string;
  goals_focus: string;
  prefers_afk_methods: boolean;
  prefers_profitable_methods: boolean;
};

type ProfileViewProps = {
  accounts: Account[];
  busyAction: string | null;
  newAccountRsn: string;
  onChangeNewAccountRsn: Dispatch<SetStateAction<string>>;
  onGoToAdvisor: () => void;
  onQuickstartAccount: () => void;
  onSaveProfile: () => void;
  profile: Profile | null;
  profileDraft: ProfileDraft;
  selectedAccountRsn: string | null;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
};

export function ProfileView({
  accounts,
  busyAction,
  newAccountRsn,
  onChangeNewAccountRsn,
  onGoToAdvisor,
  onQuickstartAccount,
  onSaveProfile,
  profile,
  profileDraft,
  selectedAccountRsn,
  setProfileDraft,
}: ProfileViewProps) {
  const normalizedNewRsn = newAccountRsn.trim().toLowerCase();
  const pendingExistingAccount = accounts.find((account) => account.rsn.trim().toLowerCase() === normalizedNewRsn) ?? null;

  return (
    <div className="space-y-8">
      <section className="border-b border-white/8 pb-7">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Profile // Workspace baseline
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[2.8rem] font-black uppercase leading-[0.98] tracking-[0.08em] text-white md:text-[3.7rem]">
              Set the planning baseline for your workspace
            </h1>
            <p className="mt-4 max-w-3xl text-[0.96rem] leading-8 text-osrs-text-soft">
              These settings shape recommendation tone, default routing, and which account the rest of the
              workspace should naturally orient around. They inform Cerebro&apos;s advice, but they should not
              trap the assistant inside one planning style.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={onGoToAdvisor} variant="secondary">
              Ask Cerebro
            </Button>
            <Button onClick={onSaveProfile}>
              {busyAction === "profile" ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
        <section className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-white/8 bg-[#101010] px-5 py-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Primary RSN</p>
              <p className="mt-3 font-display text-[1.35rem] uppercase text-white">
                {profileDraft.primary_account_rsn || "Not set"}
              </p>
            </div>
            <div className="border border-white/8 bg-[#101010] px-5 py-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Goal focus</p>
              <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{profileDraft.goals_focus}</p>
            </div>
            <div className="border border-white/8 bg-[#101010] px-5 py-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Play style</p>
              <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{profileDraft.play_style}</p>
            </div>
          </div>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-5 border-b border-white/8 pb-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Workspace defaults</p>
              <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">
                Recommendation profile
              </h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                These preferences follow you across recommendations, goals, and advisor replies.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="w-full border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))
                }
                placeholder="Display name"
                value={profileDraft.display_name}
              />
              <input
                className="w-full border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    primary_account_rsn: event.target.value,
                  }))
                }
                placeholder="Primary account RSN"
                value={profileDraft.primary_account_rsn}
              />
              <select
                className="w-full border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none focus:border-osrs-gold/40"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    play_style: event.target.value,
                  }))
                }
                value={profileDraft.play_style}
              >
                <option value="balanced">Balanced</option>
                <option value="afk">AFK</option>
                <option value="profitable">Profitable</option>
              </select>
              <select
                className="w-full border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none focus:border-osrs-gold/40"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    goals_focus: event.target.value,
                  }))
                }
                value={profileDraft.goals_focus}
              >
                <option value="progression">Progression</option>
                <option value="quest cape">Quest Cape</option>
                <option value="bossing">Bossing</option>
              </select>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-3 border border-white/8 bg-[#121212] px-4 py-4 text-sm text-osrs-text-soft">
                <input
                  checked={profileDraft.prefers_afk_methods}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      prefers_afk_methods: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Prefer AFK methods</span>
              </label>
              <label className="flex items-center gap-3 border border-white/8 bg-[#121212] px-4 py-4 text-sm text-osrs-text-soft">
                <input
                  checked={profileDraft.prefers_profitable_methods}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      prefers_profitable_methods: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Prefer profitable methods</span>
              </label>
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="border border-white/8 bg-[#101010] px-5 py-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Primary account</p>
            <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Linked RSNs</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              Pick which linked account the rest of the workspace should naturally orient around.
            </p>

            <div className="mt-5 space-y-3">
              <div className="space-y-3 border border-white/8 bg-[#0c0c0c] px-4 py-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Link a new RSN</p>
                <input
                  className="w-full border border-white/8 bg-[#080808] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
                  onChange={(event) => onChangeNewAccountRsn(event.target.value)}
                  placeholder="RuneScape name"
                  value={newAccountRsn}
                />
                <Button
                  className="w-full"
                  onClick={onQuickstartAccount}
                  type="button"
                  variant="secondary"
                >
                  {busyAction === "quickstart-account"
                    ? "Syncing..."
                    : pendingExistingAccount
                      ? `Sync ${pendingExistingAccount.rsn}`
                      : "Add + sync RSN"}
                </Button>
              </div>

              {accounts.length > 0 ? (
                accounts.map((account) => {
                  const isActive = profileDraft.primary_account_rsn === account.rsn;
                  return (
                    <button
                      className={`w-full border px-4 py-4 text-left ${
                        isActive ? "border-osrs-gold/45 bg-white/[0.03]" : "border-white/8 bg-[#121212]"
                      }`}
                      key={account.id}
                      onClick={() =>
                        setProfileDraft((current) => ({
                          ...current,
                          primary_account_rsn: account.rsn,
                        }))
                      }
                      type="button"
                    >
                      <strong className="block font-display text-[1.1rem] uppercase text-white">{account.rsn}</strong>
                      <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                        {selectedAccountRsn === account.rsn
                          ? "Currently selected in the sidebar."
                          : "Linked account in this workspace."}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="border border-dashed border-white/10 bg-[#121212] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
                  No linked accounts yet. Add an RSN from the dashboard first, then come back here to set the default account.
                </div>
              )}
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010] px-5 py-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Current saved profile</p>
            <p className="mt-4 text-sm leading-7 text-osrs-text-soft">
              {profile
                ? `${profile.display_name || "Unnamed"} | ${profile.play_style} | ${profile.goals_focus}`
                : "No profile loaded yet."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
