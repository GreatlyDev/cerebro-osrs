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
    "inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] cerebro-hover cerebro-press disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:
      "border-osrs-border-light/70 bg-osrs-button text-[#241708] shadow-[inset_0_1px_0_rgba(255,241,214,0.35),0_10px_20px_rgba(71,47,18,0.24)]",
    secondary:
      "border-osrs-border/80 bg-[linear-gradient(180deg,rgba(56,45,34,0.88),rgba(29,23,18,0.96))] text-osrs-text shadow-osrs",
    ghost:
      "border-osrs-border/70 bg-white/5 text-osrs-text",
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
