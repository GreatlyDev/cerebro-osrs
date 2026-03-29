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
    "inline-flex min-h-[2.9rem] items-center justify-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osrs-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-osrs-bg cerebro-hover cerebro-press disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:
      "border-osrs-border-light/70 bg-[linear-gradient(135deg,rgba(217,191,134,0.98),rgba(200,164,90,0.94)_58%,rgba(122,88,39,0.96))] text-[#181109] shadow-[inset_0_1px_0_rgba(255,241,214,0.38),0_12px_24px_rgba(71,47,18,0.24)] hover:brightness-105",
    secondary:
      "border-osrs-border/80 bg-[linear-gradient(180deg,rgba(56,45,34,0.88),rgba(29,23,18,0.96))] text-osrs-text shadow-osrs hover:border-osrs-border-light/60",
    ghost:
      "border-osrs-border/70 bg-white/5 text-osrs-text hover:bg-white/8",
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
