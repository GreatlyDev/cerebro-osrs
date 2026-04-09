import type { HTMLAttributes, ReactNode } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "soft" | "hero";
};

export function Panel({ children, className = "", tone = "default", ...props }: PanelProps) {
  const toneClass = {
    default:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_26%),linear-gradient(180deg,rgba(20,18,16,0.98),rgba(14,13,11,0.98))]",
    soft:
      "bg-[radial-gradient(circle_at_top_left,rgba(217,191,134,0.06),transparent_24%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(14,13,11,0.98))]",
    hero:
      "bg-[radial-gradient(circle_at_top_right,rgba(143,183,201,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(200,164,90,0.10),transparent_28%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(14,13,11,0.98))]",
  } as const;

  return (
    <div
      className={`cerebro-frame rounded-panel border border-osrs-border/55 p-4 md:p-5 shadow-osrs shadow-insetPanel transition-[border-color,box-shadow,transform] duration-200 ease-out ${toneClass[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
