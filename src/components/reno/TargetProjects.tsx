import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate, getBoard } from "@/lib/reno";

// Renovation projects that apply to one room or building element.
export async function TargetProjects({ targetId }: { targetId: string }) {
  const t = await getTranslations("reno");
  const locale = await getLocale();
  const { cards } = await getBoard(locale);
  const projects = cards.filter((c) => c.targetIds.includes(targetId));
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">{t("projectsHere")}</h2>
        <Link href={`/verbouwing/nieuw?target=${targetId}`} className="text-sm font-semibold text-brick hover:underline">+ {t("newProject")}</Link>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted">{t("noProjectsHere")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <Link href={`/verbouwing/${p.id}`} className="block truncate font-semibold hover:text-brick">{p.title}</Link>
                <span className="text-sm text-muted">{t(`phase.${p.phase}`)}{p.end_date ? ` · ${formatDate(p.end_date, locale)}` : ""}</span>
              </span>
              <span className={`chip ${p.status === "gereed" ? "bg-canal text-surface" : "bg-ground text-ink"}`}>{t(`status.${p.status}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
