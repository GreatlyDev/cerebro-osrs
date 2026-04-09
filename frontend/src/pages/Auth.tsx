import { Button } from "../components/ui/Button";

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

function statusCopy(status: "online" | "offline" | "checking") {
  if (status === "online") {
    return "Telemetry online";
  }
  if (status === "offline") {
    return "Backend offline";
  }
  return "Checking backend";
}

function statusTone(status: "online" | "offline" | "checking") {
  if (status === "online") {
    return "text-osrs-success";
  }
  if (status === "offline") {
    return "text-osrs-danger";
  }
  return "text-osrs-gold";
}

export function AuthView(props: AuthViewProps) {
  const isRegister = props.authMode === "register";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808] text-osrs-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(212,175,55,0.06),transparent_24%),linear-gradient(180deg,#080808_0%,#0a0a0a_58%,#090909_100%)]" />
      <div className="pointer-events-none absolute inset-0 cerebro-vignette opacity-80" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-20 border-r border-osrs-border/30 bg-black/65 xl:flex xl:flex-col xl:items-center xl:justify-between xl:py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-osrs-border/40 bg-[#111111]">
            <svg className="h-6 w-6 text-white" viewBox="0 0 100 100" fill="none">
              <path d="M50 7 92 40 50 93 8 40Z" stroke="currentColor" strokeWidth="8" />
            </svg>
          </div>
          <span className="text-[0.58rem] uppercase tracking-[0.28em] text-osrs-text-soft [writing-mode:vertical-rl]">
            Cerebro
          </span>
          <span className={`h-2.5 w-2.5 rounded-full ${props.backendStatus === "online" ? "bg-osrs-success" : props.backendStatus === "offline" ? "bg-osrs-danger" : "bg-osrs-gold"}`} />
        </aside>

        <main className="mx-auto grid min-h-screen w-full max-w-[1680px] gap-10 px-6 py-10 xl:grid-cols-[minmax(0,1fr)_28rem] xl:px-14 xl:py-14">
          <section className="flex min-h-[32rem] flex-col justify-between border border-osrs-border/30 bg-[radial-gradient(circle_at_76%_24%,rgba(212,175,55,0.08),transparent_32%),linear-gradient(180deg,#090909_0%,#0b0b0b_100%)] px-8 py-8 xl:px-10 xl:py-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[0.68rem] uppercase tracking-[0.38em] text-osrs-text-soft">
                  Protocol v4.02 // Workspace access
                </p>
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${props.backendStatus === "online" ? "bg-osrs-success" : props.backendStatus === "offline" ? "bg-osrs-danger" : "bg-osrs-gold"}`} />
                  <span className={`text-[0.62rem] uppercase tracking-[0.24em] ${statusTone(props.backendStatus)}`}>
                    {statusCopy(props.backendStatus)}
                  </span>
                </div>
              </div>
              <div>
                <h1 className="font-sans text-[4.2rem] font-black uppercase tracking-[0.08em] text-white md:text-[5.2rem] xl:text-[6rem]">
                  Cerebro
                </h1>
                <p className="mt-3 text-sm uppercase tracking-[0.24em] text-osrs-text-soft">
                  Old school runescape intelligence
                </p>
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_18rem]">
              <div className="space-y-5">
                <div className="inline-flex border border-osrs-gold/80 px-3 py-1 text-[0.66rem] uppercase tracking-[0.24em] text-osrs-gold">
                  {isRegister ? "Create workspace" : "Access workspace"}
                </div>
                <h2 className="max-w-4xl font-sans text-[2.5rem] font-black uppercase leading-[0.96] tracking-[-0.04em] text-white md:text-[3.6rem]">
                  {isRegister ? "Build your own Cerebro command room" : "Re-enter your Cerebro command room"}
                </h2>
                <p className="max-w-2xl text-[1rem] leading-8 text-osrs-text-soft">
                  Keep linked accounts, advisor sessions, goals, and telemetry in one grounded OSRS workspace. The same identity follows your planning context instead of resetting every visit.
                </p>
              </div>

              <div className="space-y-4 border border-osrs-border/30 bg-[#111111] p-5">
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.22em] text-osrs-gold">Workspace readout</p>
                  <div className="mt-4 space-y-3 text-sm text-osrs-text-soft">
                    <div className="flex items-center justify-between gap-3">
                      <span>Mode</span>
                      <strong className="font-sans text-[1.05rem] font-bold uppercase text-white">
                        {isRegister ? "New account" : "Sign in"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Backend</span>
                      <strong className={`font-sans text-[1.05rem] font-bold uppercase ${statusTone(props.backendStatus)}`}>
                        {props.backendStatus}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Assistant</span>
                      <strong className="font-sans text-[1.05rem] font-bold uppercase text-white">Ready</strong>
                    </div>
                  </div>
                </div>
                <div className="border-t border-osrs-border/25 pt-4 text-sm leading-7 text-osrs-text-soft">
                  Sign in once and the rest of the app can stay account-aware, assistant-driven, and personalized instead of operating like a demo shell.
                </div>
              </div>
            </div>
          </section>

          <section className="border border-osrs-border/30 bg-[#111111] px-6 py-6 xl:px-7 xl:py-7">
            <div className="space-y-6">
              <div className="inline-flex w-full rounded-full border border-osrs-border/35 bg-black/30 p-1">
                <button
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm uppercase tracking-[0.12em] ${
                    props.authMode === "login" ? "bg-white text-black" : "text-osrs-text-soft"
                  }`}
                  onClick={() => props.setAuthMode("login")}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm uppercase tracking-[0.12em] ${
                    props.authMode === "register" ? "bg-white text-black" : "text-osrs-text-soft"
                  }`}
                  onClick={() => props.setAuthMode("register")}
                  type="button"
                >
                  Create account
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[0.64rem] uppercase tracking-[0.28em] text-osrs-gold">
                  {isRegister ? "New workspace" : "Returning workspace"}
                </p>
                <h3 className="font-sans text-[1.9rem] font-bold uppercase leading-tight tracking-[0.02em] text-white">
                  {isRegister ? "Create your planning workspace" : "Sign in to keep going"}
                </h3>
                <p className="text-sm leading-7 text-osrs-text-soft">
                  {isRegister
                    ? "Use a real email and password to create a local Cerebro account."
                    : "Use the credentials tied to your local Cerebro workspace."}
                </p>
              </div>

              {props.error ? (
                <div className="border border-osrs-danger/35 bg-osrs-danger/10 px-4 py-4 text-sm leading-6 text-osrs-text">
                  {props.error}
                </div>
              ) : null}

              <div className="space-y-3">
                <input
                  className="w-full border border-osrs-border/35 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-border-light/60"
                  onChange={(event) => props.setLoginEmail(event.target.value)}
                  placeholder="Email address"
                  value={props.loginEmail}
                />
                <input
                  className="w-full border border-osrs-border/35 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-border-light/60"
                  onChange={(event) => props.setLoginDisplayName(event.target.value)}
                  placeholder={isRegister ? "Display name" : "Display name (optional)"}
                  value={props.loginDisplayName}
                />
                <input
                  className="w-full border border-osrs-border/35 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-border-light/60"
                  onChange={(event) => props.setLoginPassword(event.target.value)}
                  placeholder={isRegister ? "Password (8+ characters)" : "Password"}
                  type="password"
                  value={props.loginPassword}
                />
                <p className="text-sm leading-6 text-osrs-text-soft">
                  {isRegister
                    ? "Choose a password with at least 8 characters. This workspace identity can keep growing with the product."
                    : "Use the password tied to this workspace. Older seeded identities can still use the dev shortcut below."}
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

              <div className="border-t border-osrs-border/25 pt-5">
                <p className="text-[0.62rem] uppercase tracking-[0.24em] text-osrs-gold">Local dev shortcut</p>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                  If you already used the earlier dev-login flow, you can still use that shortcut while we keep tightening the full auth experience.
                </p>
                <Button className="mt-4 w-full" onClick={props.onLogin} variant="secondary">
                  Use dev shortcut
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
