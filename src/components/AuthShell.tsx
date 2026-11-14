import { Wordmark } from "@/components/Wordmark";

export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
        </div>
        <div className="card p-6">
          <h1 className="font-serif text-2xl font-semibold">{title}</h1>
          {intro ? <p className="mt-1 text-sm text-muted">{intro}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </main>
  );
}
