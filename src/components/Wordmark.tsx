/* eslint-disable @next/next/no-img-element */
export function Wordmark({ className = "", size = 32, showIcon = true, textClass = "text-xl" }: { className?: string; size?: number; showIcon?: boolean; textClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {showIcon ? <img src="/icons/logo-96.png" alt="" width={size} height={size} className="shrink-0 rounded-[22%]" /> : null}
      <span className={`whitespace-nowrap font-display font-bold tracking-tight text-ink ${textClass}`}>
        LayeredCake{" "}
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">MOVE</span>
      </span>
    </span>
  );
}
