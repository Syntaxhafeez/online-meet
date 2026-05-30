import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-[#17120a] outline-none transition placeholder:text-[#756b5d] focus:ring-2 focus:ring-ring",
        className
      )}
      {...props}
    />
  );
}
