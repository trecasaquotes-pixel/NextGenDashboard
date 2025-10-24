import { cn } from "@/lib/utils";

interface RedDotProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function RedDot({ className, size = "md", animated = true }: RedDotProps) {
  const sizeClasses = {
    sm: "w-2 h-2",      // 8px
    md: "w-2.5 h-2.5",  // 10px
    lg: "w-3 h-3",      // 12px
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full bg-[#E50914] ml-[0.4em]",
        sizeClasses[size],
        animated && "animate-in fade-in duration-300",
        className
      )}
      aria-hidden="true"
    />
  );
}
