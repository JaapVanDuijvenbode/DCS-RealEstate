import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { VERDICTS, formatEur, getRenoReference } from "@/lib/reno";
import { addMoodItem, deleteMoodItem, setMoodVerdict } from "@/app/(app)/verbouwing/actions";
import { PhotoInput } from "@/components/PhotoInput";
import { SubmitButton } from "@/components/SubmitButton";
import { getMe } from "@/lib/data";

type Props = { kind: "room" | "element" | "project"; targetId: string; back: string; title?: string };

type MoodRow = {
  id: string;
  kind: "image" | "link" | "color" | "material";
  title: string | null;
  storage_path: string | null;
  url: string | null;
  color_code: string | null;
  color_hex: string | null;
  vendor_id: string | null;
  price_eur: number | null;
  note: string | null;
  verdict: "favoriet" | "optie" | "afgewezen";
  created_by: string | null;
};

const VERDICT_TONE: Record<string, string> = {
  favoriet: "bg-canal text-surface",
  optie: "bg-ground text-ink",
  afgewezen: "bg-line text-muted line-through",
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function MoodBoard({ kind, targetId, back, title }: Props) {
  const t = await getTranslations("mood");
  const locale = await getLocale();
  const me = await getMe();
  const { vendors, vendorById } = await getRenoReference();
  const supabase = await createClient();
  const { data } = await supabase.from("mood_items").select("*").eq(`${kind}_id`, targetId).order("created_at", { ascending: false });
  const items = ((data ?? []) as MoodRow[]).sort((a, b) => VERDICTS.indexOf(a.verdict) - VERDICTS.indexOf(b.verdict));
  const paths = items.filter((i) => i.storage_path).map((i) => i.storage_path!) ;
  const signed = paths.length ? (await supabase.storage.from("photos").createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const hidden = (
    <>
      <input type="hidden" name="target_kind" value={kind} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="back" value={back} />
    </>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">{title ?? t("title")}</h2>
        <span className="text-sm text-muted">{t("count", { count: items.length })}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => {
            const img = m.storage_path ? urlByPath.get(m.storage_path) : null;
            const vendor = vendorById.get(m.vendor_id ?? "");
            return (
              <li key={m.id} className={`card flex flex-col overflow-hidden ${m.verdict === "afgewezen" ? "opacity-60" : ""}`}>
                {m.kind === "image" && img ? (
                  <a href={img} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-ground">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={m.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
                  </a>
                ) : null}
                {m.kind === "color" ? (
                  <div className="flex aspect-[4/3] items-end p-3" style={{ background: m.color_hex ?? "var(--line)" }}>
                    <span className="rounded bg-surface/90 px-2 py-0.5 text-sm font-semibold text-ink">{m.color_code}</span>
                  </div>
                ) : null}
                {m.kind === "link" && m.url ? (
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex aspect-[4/3] flex-col justify-end bg-ground p-3 hover:bg-brick-tint">
                    <span className="text-xs uppercase tracking-wide text-muted">{t("kind.link")}</span>
                    <span className="truncate font-semibold text-brick">{hostOf(m.url)}</span>
                  </a>
                ) : null}
                {m.kind === "material" ? (
                  <div className="flex aspect-[4/3] flex-col justify-end bg-ground p-3">
                    <span className="text-xs uppercase tracking-wide text-muted">{t("kind.material")}</span>
                    <span className="font-semibold">{m.title}</span>
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-1.5 p-3 text-sm">
                  {m.title && m.kind !== "material" ? <p className="font-semibold">{m.title}</p> : null}
                  {vendor || m.price_eur ? (
                    <p className="text-muted">
                      {vendor?.name ?? ""}
                      {vendor && m.price_eur ? " · " : ""}
                      {m.price_eur ? formatEur(m.price_eur, locale) : ""}
                    </p>
                  ) : null}
                  {m.kind === "material" && m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer" className="truncate text-brick hover:underline">{hostOf(m.url)}</a>
                  ) : null}
                  {m.note ? <p className="text-muted">{m.note}</p> : null}
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    {VERDICTS.map((v) => (
                      <form key={v} action={setMoodVerdict}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="verdict" value={v} />
                        <input type="hidden" name="back" value={back} />
                        <button
                          type="submit"
                          aria-pressed={m.verdict === v}
                          className={`chip min-h-8 ${m.verdict === v ? VERDICT_TONE[v] : "border border-line bg-surface text-muted hover:border-brick"}`}
                        >
                          {t(`verdict.${v}`)}
                        </button>
                      </form>
                    ))}
                    {me?.role === "super_user" || m.created_by === me?.id ? (
                      <form action={deleteMoodItem} className="ml-auto">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="back" value={back} />
                        <button type="submit" aria-label={t("delete")} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-danger">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <form action={addMoodItem} className="card space-y-2 p-4">
          {hidden}
          <input type="hidden" name="kind" value="image" />
          <p className="font-semibold">{t("add.image")}</p>
          <PhotoInput autoSubmit />
        </form>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">{t("add.link")}</summary>
          <form action={addMoodItem} className="mt-3 space-y-2">
            {hidden}
            <input type="hidden" name="kind" value="link" />
            <label className="sr-only" htmlFor={`url-${targetId}`}>{t("url")}</label>
            <input id={`url-${targetId}`} name="url" type="url" required className="field" placeholder="https://" />
            <label className="sr-only" htmlFor={`lt-${targetId}`}>{t("titleField")}</label>
            <input id={`lt-${targetId}`} name="title" className="field" placeholder={t("titleField")} />
            <SubmitButton>{t("addButton")}</SubmitButton>
          </form>
        </details>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">{t("add.color")}</summary>
          <form action={addMoodItem} className="mt-3 space-y-2">
            {hidden}
            <input type="hidden" name="kind" value="color" />
            <div className="grid grid-cols-[1fr_64px] gap-2">
              <div>
                <label className="label" htmlFor={`cc-${targetId}`}>{t("colorCode")}</label>
                <input id={`cc-${targetId}`} name="color_code" required className="field" placeholder="RAL 9010 / NCS S 0502-Y" />
              </div>
              <div>
                <label className="label" htmlFor={`ch-${targetId}`}>{t("swatch")}</label>
                <input id={`ch-${targetId}`} name="color_hex" type="color" defaultValue="#f1ece1" className="h-11 w-full cursor-pointer rounded-lg border border-line bg-surface p-1" />
              </div>
            </div>
            <label className="sr-only" htmlFor={`ct-${targetId}`}>{t("titleField")}</label>
            <input id={`ct-${targetId}`} name="title" className="field" placeholder={t("colorWhere")} />
            <SubmitButton>{t("addButton")}</SubmitButton>
          </form>
        </details>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">{t("add.material")}</summary>
          <form action={addMoodItem} className="mt-3 space-y-2">
            {hidden}
            <input type="hidden" name="kind" value="material" />
            <label className="sr-only" htmlFor={`mt-${targetId}`}>{t("materialName")}</label>
            <input id={`mt-${targetId}`} name="title" required className="field" placeholder={t("materialName")} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor={`mv-${targetId}`}>{t("vendor")}</label>
                <select id={`mv-${targetId}`} name="vendor_id" className="field" defaultValue="">
                  <option value="">-</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={`mp-${targetId}`}>{t("price")}</label>
                <input id={`mp-${targetId}`} name="price_eur" inputMode="decimal" className="field" />
              </div>
            </div>
            <label className="sr-only" htmlFor={`mu-${targetId}`}>{t("url")}</label>
            <input id={`mu-${targetId}`} name="url" type="url" className="field" placeholder={t("productLink")} />
            <label className="sr-only" htmlFor={`mn-${targetId}`}>{t("note")}</label>
            <input id={`mn-${targetId}`} name="note" className="field" placeholder={t("note")} />
            <SubmitButton>{t("addButton")}</SubmitButton>
          </form>
        </details>
      </div>
    </section>
  );
}
