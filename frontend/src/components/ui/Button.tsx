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
    "inline-flex min-h-[2.65rem] items-center justify-center gap-2 rounded-[4px] border px-4 py-2.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osrs-gold/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:
      "border-osrs-gold/45 bg-[linear-gradient(180deg,rgba(30,23,12,0.92),rgba(15,12,8,0.98))] text-osrs-gold-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-osrs-gold/75 hover:bg-[linear-gradient(180deg,rgba(40,30,15,0.95),rgba(18,14,9,1))] hover:text-white hover:shadow-[0_12px_24px_rgba(0,0,0,0.24)]",
    secondary:
      "border-white/8 bg-[#101010] text-osrs-text-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-osrs-gold/28 hover:bg-[#131313] hover:text-white hover:shadow-[0_12px_24px_rgba(0,0,0,0.18)]",
    ghost:
      "border-white/8 bg-white/[0.02] text-osrs-text-soft hover:border-white/14 hover:bg-white/[0.04] hover:text-white hover:shadow-[0_10px_18px_rgba(0,0,0,0.14)]",
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
