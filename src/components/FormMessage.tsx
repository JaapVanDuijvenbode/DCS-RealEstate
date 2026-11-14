export function FormMessage({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error)
    return (
      <p role="alert" className="rounded-lg bg-brick-tint px-3 py-2 text-sm text-ink">
        {error}
      </p>
    );
  if (ok)
    return (
      <p role="status" className="rounded-lg bg-canal-tint px-3 py-2 text-sm text-ink">
        {ok}
      </p>
    );
  return null;
}
