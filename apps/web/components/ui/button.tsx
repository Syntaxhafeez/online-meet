import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "ghost" | "outline";
  size?: "default" | "icon" | "sm";
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary px-4 text-primary-foreground hover:brightness-95",
        variant === "secondary" && "bg-secondary px-4 text-secondary-foreground hover:bg-secondary/90",
        variant === "destructive" && "bg-destructive px-4 text-destructive-foreground hover:brightness-95",
        variant === "ghost" && "px-3 hover:bg-muted",
        variant === "outline" && "border border-border bg-background px-4 hover:bg-muted",
        size === "default" && "h-11 text-sm",
        size === "sm" && "h-9 px-3 text-sm",
        size === "icon" && "h-11 w-11 p-0",
        className
      )}
      {...props}
    />
  );
}
