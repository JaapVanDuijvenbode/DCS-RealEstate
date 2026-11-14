"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, variant = "primary", className = "" }: { children: React.ReactNode; variant?: "primary" | "secondary"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`}>
      {pending ? "…" : children}
    </button>
  );
}
