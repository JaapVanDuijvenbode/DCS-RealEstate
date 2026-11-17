/* eslint-disable @next/next/no-img-element */
export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <img src="/icons/icon-192.png" alt="" width={88} height={88} className="rounded-[22%] shadow-[0_18px_40px_-18px_rgb(103_19_67_/_0.55)]" />
          <span className="font-display text-2xl font-bold tracking-tight">
            LayeredCake <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">MOVE</span>
          </span>
        </div>
        <div className="glass rounded-3xl p-6">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {intro ? <p className="mt-1 text-sm text-muted">{intro}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </main>
  );
}
