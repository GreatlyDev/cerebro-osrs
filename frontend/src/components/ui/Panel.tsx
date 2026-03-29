import type { HTMLAttributes, ReactNode } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "soft" | "hero";
};

export function Panel({ children, className = "", tone = "default", ...props }: PanelProps) {
  const toneClass = {
    default:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.025),transparent_28%),linear-gradient(180deg,rgba(42,33,26,0.96),rgba(26,21,17,0.98))]",
    soft:
      "bg-[radial-gradient(circle_at_top_left,rgba(217,191,134,0.08),transparent_24%),linear-gradient(180deg,rgba(49,39,30,0.88),rgba(25,20,16,0.96))]",
    hero:
      "bg-[radial-gradient(circle_at_top_right,rgba(143,183,201,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(200,164,90,0.16),transparent_30%),linear-gradient(180deg,rgba(44,34,24,0.96),rgba(23,18,14,0.98))]",
  } as const;

  return (
    <div
      className={`cerebro-frame rounded-panel border border-osrs-border/80 p-5 shadow-osrs shadow-insetPanel transition-[border-color,box-shadow,transform] duration-200 ease-out ${toneClass[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
