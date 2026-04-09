import type { HTMLAttributes, ReactNode } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "soft" | "hero";
};

export function Panel({ children, className = "", tone = "default", ...props }: PanelProps) {
  const toneClass = {
    default:
      "bg-[#101010]",
    soft:
      "bg-[#0f0f0f]",
    hero:
      "bg-[radial-gradient(circle_at_78%_24%,rgba(212,175,55,0.08),transparent_28%),linear-gradient(180deg,#0b0b0b_0%,#101010_100%)]",
  } as const;

  return (
    <div
      className={`cerebro-frame rounded-[10px] border border-white/8 p-4 md:p-5 transition-[border-color,transform] duration-200 ease-out ${toneClass[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
