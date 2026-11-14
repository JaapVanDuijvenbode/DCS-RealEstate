export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-xl font-semibold text-ink ${className}`}>
      LayeredCake <span className="text-brick">MOVE</span>
    </span>
  );
}
