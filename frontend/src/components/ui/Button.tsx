import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-[2.8rem] items-center justify-center gap-2 rounded-[12px] border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osrs-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-osrs-bg cerebro-hover cerebro-press disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:
      "border-osrs-border-light/60 bg-[linear-gradient(135deg,rgba(217,191,134,0.94),rgba(200,164,90,0.9)_58%,rgba(122,88,39,0.94))] text-[#181109] shadow-[inset_0_1px_0_rgba(255,241,214,0.32),0_10px_20px_rgba(71,47,18,0.2)] hover:brightness-105",
    secondary:
      "border-osrs-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.34))] text-osrs-text shadow-osrs hover:border-osrs-border-light/60",
    ghost:
      "border-osrs-border/45 bg-white/4 text-osrs-text hover:bg-white/8",
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
