import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
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
  onGoToAdvisor: () => void;
  onSaveProfile: () => void;
  profile: Profile | null;
  profileDraft: ProfileDraft;
  selectedAccountRsn: string | null;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
};

export function ProfileView({
  accounts,
  busyAction,
  onGoToAdvisor,
  onSaveProfile,
  profile,
  profileDraft,
  selectedAccountRsn,
  setProfileDraft,
}: ProfileViewProps) {
  return (
    <div className="space-y-6">
      <PageHero
        action={
          <div className="flex flex-wrap gap-3">
            <Button onClick={onGoToAdvisor} variant="secondary">Ask Cerebro</Button>
            <Button onClick={onSaveProfile}>{busyAction === "profile" ? "Saving..." : "Save profile"}</Button>
          </div>
        }
        chips={[
          { label: "Primary RSN", value: profileDraft.primary_account_rsn || "Not set" },
          { label: "Goal focus", value: profileDraft.goals_focus },
          { label: "Play style", value: profileDraft.play_style },
        ]}
        description="These settings shape recommendation tone, default routing, and which account the rest of the workspace should naturally orient around. They inform Cerebro's advice, but they should not trap the assistant inside one planning style."
        eyebrow="Profile"
        title="Set the planning baseline for your workspace"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_24rem]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Workspace defaults"
            subtitle="These preferences follow you across recommendations, goals, and advisor replies."
            title="Recommendation profile"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
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
              className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
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
              className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
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
              className="rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
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
          <div className="grid gap-3">
            <label className="flex items-center gap-3 rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 text-sm text-osrs-text-soft shadow-insetPanel">
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
            <label className="flex items-center gap-3 rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 text-sm text-osrs-text-soft shadow-insetPanel">
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
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Primary account"
            subtitle="Pick which linked account the rest of the workspace should naturally orient around."
            title="Linked RSNs"
          />
          {accounts.length > 0 ? (
            <div className="grid gap-3">
              {accounts.map((account) => {
                const isActive = profileDraft.primary_account_rsn === account.rsn;
                return (
                  <button
                    className={`cerebro-hover rounded-[16px] border px-4 py-4 text-left shadow-insetPanel ${
                      isActive
                        ? "border-osrs-border-light/80 bg-[linear-gradient(135deg,rgba(200,164,90,0.22),rgba(58,47,38,0.12))] shadow-glowGold"
                        : "border-osrs-border/70 bg-osrs-panel-2/55"
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
                    <strong className="block font-display text-lg text-osrs-text">{account.rsn}</strong>
                    <p className="mt-2 text-sm text-osrs-text-soft">
                      {selectedAccountRsn === account.rsn ? "Currently selected in the sidebar." : "Linked account in this workspace."}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              No linked accounts yet. Add an RSN from the dashboard first, then come back here to set the default account.
            </div>
          )}
          <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 text-sm leading-6 text-osrs-text-soft shadow-insetPanel">
            <strong className="block text-osrs-text">Current saved profile</strong>
            <p className="mt-2">
              {profile
                ? `${profile.display_name || "Unnamed"} | ${profile.play_style} | ${profile.goals_focus}`
                : "No profile loaded yet."}
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
