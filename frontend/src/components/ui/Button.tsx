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
    "inline-flex min-h-[2.85rem] items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osrs-gold/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:
      "border-osrs-gold/55 bg-[linear-gradient(180deg,rgba(48,38,22,0.92),rgba(22,18,12,0.98))] text-osrs-gold-soft hover:border-osrs-gold/75 hover:text-white",
    secondary:
      "border-white/8 bg-[#101010] text-osrs-text-soft hover:border-white/16 hover:text-white",
    ghost:
      "border-white/8 bg-white/[0.02] text-osrs-text-soft hover:bg-white/[0.04] hover:text-white",
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
