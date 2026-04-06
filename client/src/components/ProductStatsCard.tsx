import React from "react";
import { cn } from "@/lib/utils";

type StatsVariant = "default" | "accent" | "warning";

interface ProductStatsCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  subtext?: string;
  variant?: StatsVariant;
  className?: string;
}

// Bảng màu theo variant
const VARIANT_STYLES: Record<StatsVariant, { card: string; value: string; icon: string }> = {
  default: {
    card: "border-border",
    value: "text-foreground",
    icon: "text-muted-foreground",
  },
  accent: {
    card: "border-accent/30 bg-accent/5",
    value: "text-accent",
    icon: "text-accent",
  },
  warning: {
    card: "border-orange-400/30 bg-orange-50 dark:bg-orange-950/20",
    value: "text-orange-600 dark:text-orange-400",
    icon: "text-orange-500",
  },
};

export function ProductStatsCard({
  label,
  value,
  icon,
  subtext,
  variant = "default",
  className,
}: ProductStatsCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      data-testid="product-stats-card"
      data-variant={variant}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm",
        styles.card,
        className
      )}
    >
      {/* Header: icon + label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border", styles.icon)}>
            {icon}
          </span>
        )}
      </div>

      {/* Giá trị chính */}
      <span className={cn("text-3xl font-bold tracking-tight", styles.value)}>
        {value}
      </span>

      {/* Subtext (tuỳ chọn) */}
      {subtext && (
        <span data-testid="stats-subtext" className="text-xs text-muted-foreground">
          {subtext}
        </span>
      )}
    </div>
  );
}
