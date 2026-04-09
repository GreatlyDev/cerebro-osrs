import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Panel";

type AuthViewProps = {
  authMode: "login" | "register";
  backendStatus: "online" | "offline" | "checking";
  busyAction: string | null;
  error: string | null;
  loginEmail: string;
  loginDisplayName: string;
  loginPassword: string;
  setAuthMode: (value: "login" | "register") => void;
  setLoginEmail: (value: string) => void;
  setLoginDisplayName: (value: string) => void;
  setLoginPassword: (value: string) => void;
  onLogin: () => void;
  onPasswordSubmit: () => void;
};

export function AuthView(props: AuthViewProps) {
  const isRegister = props.authMode === "register";
  const statusTone =
    props.backendStatus === "online"
      ? "border-osrs-success/40 bg-osrs-success/15"
      : props.backendStatus === "offline"
        ? "border-osrs-danger/40 bg-osrs-danger/15"
        : "border-osrs-border-light/40 bg-osrs-gold/10";

  return (
    <div className="relative min-h-screen overflow-hidden bg-osrs-bg text-osrs-text">
      <div className="pointer-events-none absolute inset-0 cerebro-texture" />
      <div className="pointer-events-none absolute inset-0 cerebro-vignette" />
      <div className="pointer-events-none absolute left-[-5rem] top-16 h-56 w-56 rounded-full bg-osrs-gold/15 cerebro-ambient-orb" />
      <div className="pointer-events-none absolute bottom-20 right-[-6rem] h-72 w-72 rounded-full bg-emerald-950/30 cerebro-ambient-orb" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-6 py-8 xl:grid-cols-[1.1fr_32rem]">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-osrs-gold">Cerebro OSRS</p>
            <h1 className="max-w-3xl font-display text-5xl leading-[1.05] text-osrs-text md:text-6xl">
              The premium control center for Old School RuneScape planning.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-osrs-text-soft">
              Sign in to a workspace that keeps your linked accounts, goals, sessions, and planning context in one modern OSRS-inspired command room.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Panel tone="soft">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">What carries over</p>
              <h2 className="mt-3 font-display text-2xl text-osrs-text">Your own workspace</h2>
              <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
                Accounts, goals, chat sessions, and planner context stay attached to your login instead of one shared demo state.
              </p>
            </Panel>
            <Panel tone="soft">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">Current phase</p>
              <h2 className="mt-3 font-display text-2xl text-osrs-text">Local product buildout</h2>
              <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
                This is already real auth for the app, but we’re still shaping the product around it while the experience keeps maturing.
              </p>
            </Panel>
            <Panel tone="soft">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-osrs-gold">Backend status</p>
              <h2 className="mt-3 font-display text-2xl text-osrs-text">Live workspace link</h2>
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${statusTone}`}>
                <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                Backend {props.backendStatus}
              </div>
            </Panel>
          </div>
        </div>

        <Panel tone="soft" className="space-y-5 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(15,13,11,0.98))]">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-osrs-border/45 bg-black/20 p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm ${props.authMode === "login" ? "bg-osrs-gold/12 text-osrs-text" : "text-osrs-text-soft"}`}
                onClick={() => props.setAuthMode("login")}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm ${props.authMode === "register" ? "bg-osrs-gold/12 text-osrs-text" : "text-osrs-text-soft"}`}
                onClick={() => props.setAuthMode("register")}
                type="button"
              >
                Create account
              </button>
            </div>
            <h2 className="font-display text-3xl text-osrs-text">
              {isRegister ? "Create your planning workspace." : "Sign in to your planner cockpit."}
            </h2>
            <p className="text-sm leading-7 text-osrs-text-soft">
              {isRegister
                ? "Use a real email and password to create a local workspace account for Cerebro."
                : "Use the credentials for your local Cerebro workspace account."}
            </p>
          </div>

          {props.error ? (
            <div className="rounded-[16px] border border-osrs-danger/40 bg-osrs-danger/15 px-4 py-4 text-sm text-osrs-text">
              {props.error}
            </div>
          ) : null}

          <div className="space-y-3">
            <input
              className="w-full rounded-[14px] border border-osrs-border/50 bg-[#101210] px-4 py-3 text-sm text-osrs-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => props.setLoginEmail(event.target.value)}
              placeholder="Email address"
              value={props.loginEmail}
            />
            <input
              className="w-full rounded-[14px] border border-osrs-border/50 bg-[#101210] px-4 py-3 text-sm text-osrs-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => props.setLoginDisplayName(event.target.value)}
              placeholder={isRegister ? "Display name" : "Display name (optional)"}
              value={props.loginDisplayName}
            />
            <input
              className="w-full rounded-[14px] border border-osrs-border/50 bg-[#101210] px-4 py-3 text-sm text-osrs-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => props.setLoginPassword(event.target.value)}
              placeholder={isRegister ? "Password (8+ characters)" : "Password"}
              type="password"
              value={props.loginPassword}
            />
            <p className="text-sm leading-6 text-osrs-text-soft">
              {isRegister
                ? "Pick a password with at least 8 characters. This workspace can keep using the same email as the product gets more personalized."
                : "Use the password tied to this workspace. Older dev-login identities can still use the local shortcut below."}
            </p>
            <Button className="w-full" onClick={props.onPasswordSubmit}>
              {props.busyAction === "login"
                ? isRegister
                  ? "Creating account..."
                  : "Signing in..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </div>

          <div className="rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.32))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Local dev shortcut</p>
            <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
              If you already have a workspace from the earlier dev-login phase, you can still use the shortcut while we transition fully into password auth.
            </p>
            <Button className="mt-4 w-full" onClick={props.onLogin} variant="secondary">
              Use dev shortcut
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
