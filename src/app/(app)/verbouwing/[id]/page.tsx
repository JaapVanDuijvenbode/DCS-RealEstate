import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/data";
import { RENO_STATUSES, bestCost, formatDate, formatEur, getBoard, getRenoReference } from "@/lib/reno";
import { addDependency, addSubsidy, createProject, deleteProject, removeDependency, removeSubsidy, setProjectStatus } from "../actions";
import { ProjectForm } from "@/components/reno/ProjectForm";
import { MoodBoard } from "@/components/reno/MoodBoard";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";

type Search = { saved?: string; dep_error?: string; edit?: string };

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const sp = await searchParams;
  const t = await getTranslations("reno");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const me = await getMe();
  const { cards, byId } = await getBoard(locale);
  const card = byId.get(id);
  if (!card) notFound();
  const { vendorById } = await getRenoReference();
  const supabase = await createClient();
  const { data: subsidies } = await supabase.from("reno_subsidies").select("*").eq("project_id", id).order("created_at");

  // Descendants cannot become this project's parent.
  const descendants = new Set<string>();
  const collect = (pid: string) => cards.filter((c) => c.parent_id === pid).forEach((c) => { descendants.add(c.id); collect(c.id); });
  collect(id);
  const parentOptions = cards.filter((c) => c.id !== id && !descendants.has(c.id)).map((c) => ({ id: c.id, title: c.title }));

  const children = cards.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const dependsOn = card.dependsOn.map((d) => byId.get(d)).filter(Boolean) as typeof cards;
  const blocks = cards.filter((c) => c.dependsOn.includes(id));
  const depCandidates = cards.filter((c) => c.id !== id && !card.dependsOn.includes(c.id));
  const vendor = vendorById.get(card.vendor_id ?? "");
  const childCost = children.reduce((n, c) => n + Number(bestCost(c) ?? 0), 0);

  const costRows = (["estimate_eur", "quote_eur", "contract_eur", "actual_eur", "forecast_eur"] as const).filter((k) => card[k] != null);

  return (
    <div className="space-y-6">
      <Link href="/verbouwing" className="text-sm text-brick">← {t("title")}</Link>
      {card.parentTitle && card.parent_id ? (
        <Link href={`/verbouwing/${card.parent_id}`} className="block text-sm text-muted hover:text-brick">↳ {card.parentTitle}</Link>
      ) : null}

      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">{card.title}</h1>
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-ground text-ink">{t(`phase.${card.phase}`)}</span>
          <span className="chip bg-ground text-ink">{t(`category.${card.category}`)}</span>
          <span className={`chip ${card.priority === "hoog" ? "bg-brick-tint text-brick" : "bg-ground text-ink"}`}>{t(`priority.${card.priority}`)}</span>
          <span className="chip bg-canal-tint text-canal">{t(`info.${card.info_status}`)}</span>
        </div>
        {card.description ? <p className="max-w-3xl whitespace-pre-line text-[15px]">{card.description}</p> : null}
      </div>

      <FormMessage ok={sp.saved ? tc("saved") : null} error={sp.dep_error ? t(sp.dep_error === "loop" ? "depLoop" : "depError") : null} />
      {card.blockedBy.length && card.status !== "gereed" ? (
        <p role="status" className="rounded-xl bg-brick-tint px-4 py-3 text-[15px]"><strong>{t("blocked")}:</strong> {t("waitsFor", { list: card.blockedBy.join(", ") })}</p>
      ) : null}
      {card.dateConflict ? <p role="status" className="rounded-xl bg-brick-tint px-4 py-3 text-[15px]">{t("dateConflict")}</p> : null}

      <form action={setProjectStatus} className="flex flex-wrap gap-2" aria-label={t("statusLabel")}>
        <input type="hidden" name="id" value={card.id} />
        {RENO_STATUSES.map((s) => (
          <button key={s} name="status" value={s} aria-pressed={card.status === s} className={`chip min-h-9 px-3 text-sm ${card.status === s ? "bg-brick text-on-brick" : "border border-line bg-surface text-ink hover:border-brick"}`}>
            {t(`status.${s}`)}
          </button>
        ))}
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("planning")}</h2>
          <dl className="mt-2 space-y-1.5 text-[15px]">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("start")}</dt><dd>{formatDate(card.start_date, locale) || "-"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("end")}</dt><dd>{formatDate(card.end_date, locale) || "-"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("owner")}</dt><dd>{card.ownerName ?? "-"}</dd></div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("vendor")}</dt>
              <dd>{vendor ? <Link href={`/verbouwing/leveranciers/${vendor.id}`} className="text-brick hover:underline">{vendor.name}</Link> : "-"}</dd>
            </div>
            <div className="pt-1 text-muted">{card.targets.join(", ")}</div>
          </dl>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("costs")}</h2>
          {costRows.length === 0 && !childCost ? (
            <p className="mt-2 text-sm text-muted">{t("noCosts")}</p>
          ) : (
            <dl className="mt-2 space-y-1.5 text-[15px]">
              {costRows.map((k) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{t(`cost.${k}`)}</dt><dd>{formatEur(card[k], locale)}</dd></div>
              ))}
              {childCost ? <div className="flex justify-between gap-3 border-t border-line pt-1.5"><dt className="text-muted">{t("childCosts")}</dt><dd>{formatEur(childCost, locale)}</dd></div> : null}
              {card.cost_basis || card.uncertainty_pct != null ? (
                <p className="pt-1 text-sm text-muted">{[card.cost_basis, card.uncertainty_pct != null ? `± ${card.uncertainty_pct}%` : null].filter(Boolean).join(" · ")}</p>
              ) : null}
            </dl>
          )}
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("monument")}</h2>
          <dl className="mt-2 space-y-1.5 text-[15px]">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("impactLabel")}</dt><dd>{t(`impact.${card.monument_impact}`)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("permitLabel")}</dt><dd>{t(`permit.${card.permit_required}`)}</dd></div>
            {card.permit_status ? <div className="flex justify-between gap-3"><dt className="text-muted">{t("permitStatus")}</dt><dd>{card.permit_status}</dd></div> : null}
            {card.permit_reference ? <div className="flex justify-between gap-3"><dt className="text-muted">{t("permitReference")}</dt><dd>{card.permit_reference}</dd></div> : null}
            {card.heritage_advice ? <p className="pt-1 text-sm text-muted">{card.heritage_advice}</p> : null}
          </dl>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-semibold">{t("subItems")}</h2>
            {children.length ? <span className="text-sm text-muted">{t("subProgress", { done: card.childDone, total: card.childCount })}</span> : null}
          </div>
          <ul className="divide-y divide-line">
            {children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/verbouwing/${c.id}`} className="min-w-0 truncate font-semibold hover:text-brick">{c.title}</Link>
                <span className={`chip shrink-0 ${c.status === "gereed" ? "bg-canal text-surface" : "bg-ground text-ink"}`}>{t(`status.${c.status}`)}</span>
              </li>
            ))}
          </ul>
          <form action={createProject} className="flex gap-2">
            <input type="hidden" name="parent_id" value={card.id} />
            <input type="hidden" name="phase" value={card.phase} />
            <input type="hidden" name="category" value={card.category} />
            <input type="hidden" name="status" value="idee" />
            <input type="hidden" name="$back" value={`/verbouwing/${card.id}`} />
            <label className="sr-only" htmlFor="sub-title">{t("subItemTitle")}</label>
            <input id="sub-title" name="title" className="field" placeholder={t("subItemTitle")} required maxLength={160} />
            <SubmitButton>{t("add")}</SubmitButton>
          </form>
          <Link href={`/verbouwing/nieuw?parent=${card.id}`} className="text-sm font-semibold text-brick hover:underline">{t("subItemFull")}</Link>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-serif text-xl font-semibold">{t("dependencies")}</h2>
          <p className="text-sm text-muted">{t("dependsOnHint")}</p>
          <ul className="divide-y divide-line">
            {dependsOn.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <Link href={`/verbouwing/${d.id}`} className="block truncate font-semibold hover:text-brick">{d.title}</Link>
                  <span className="text-sm text-muted">{t(`status.${d.status}`)}{d.end_date ? ` · ${t("endsOn", { date: formatDate(d.end_date, locale) })}` : ""}</span>
                </span>
                <form action={removeDependency}>
                  <input type="hidden" name="project_id" value={card.id} />
                  <input type="hidden" name="depends_on_id" value={d.id} />
                  <button type="submit" className="text-sm font-semibold text-muted hover:text-danger">{t("unlink")}</button>
                </form>
              </li>
            ))}
          </ul>
          {depCandidates.length ? (
            <form action={addDependency} className="flex gap-2">
              <input type="hidden" name="project_id" value={card.id} />
              <label className="sr-only" htmlFor="depends_on_id">{t("dependsOn")}</label>
              <select id="depends_on_id" name="depends_on_id" className="field" required defaultValue="">
                <option value="" disabled>{t("chooseDependency")}</option>
                {depCandidates.map((c) => <option key={c.id} value={c.id}>{c.parentTitle ? `${c.parentTitle} › ` : ""}{c.title}</option>)}
              </select>
              <SubmitButton>{t("link")}</SubmitButton>
            </form>
          ) : null}
          {blocks.length ? (
            <div>
              <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted">{t("blocks")}</h3>
              <ul className="mt-1 space-y-1">
                {blocks.map((b) => (
                  <li key={b.id}><Link href={`/verbouwing/${b.id}`} className="text-[15px] hover:text-brick">{b.title}</Link></li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <MoodBoard kind="project" targetId={card.id} back={`/verbouwing/${card.id}`} />

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-xl font-semibold">{t("subsidies")}</h2>
        {subsidies && subsidies.length ? (
          <ul className="divide-y divide-line">
            {subsidies.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[15px]">
                <span>
                  <strong>{s.scheme}</strong>
                  <span className="text-muted">
                    {s.applied_eur != null ? ` · ${t("applied")} ${formatEur(s.applied_eur, locale)}` : ""}
                    {s.granted_eur != null ? ` · ${t("granted")} ${formatEur(s.granted_eur, locale)}` : ""}
                    {s.decided_on ? ` · ${formatDate(s.decided_on, locale)}` : ""}
                  </span>
                  {s.conditions ? <span className="block text-sm text-muted">{s.conditions}</span> : null}
                </span>
                {me?.role === "super_user" ? (
                  <form action={removeSubsidy}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="project_id" value={card.id} />
                    <button type="submit" className="text-sm font-semibold text-muted hover:text-danger">{tc("delete")}</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noSubsidies")}</p>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-brick">{t("addSubsidy")}</summary>
          <form action={addSubsidy} className="mt-3 grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="project_id" value={card.id} />
            <div className="sm:col-span-3">
              <label className="label" htmlFor="scheme">{t("scheme")}</label>
              <input id="scheme" name="scheme" className="field" required placeholder="Restauratiefonds, SIM" />
            </div>
            <div><label className="label" htmlFor="applied_eur">{t("appliedEur")}</label><input id="applied_eur" name="applied_eur" inputMode="decimal" className="field" /></div>
            <div><label className="label" htmlFor="granted_eur">{t("grantedEur")}</label><input id="granted_eur" name="granted_eur" inputMode="decimal" className="field" /></div>
            <div><label className="label" htmlFor="applied_on">{t("appliedOn")}</label><input id="applied_on" name="applied_on" type="date" className="field" /></div>
            <div><label className="label" htmlFor="decided_on">{t("decidedOn")}</label><input id="decided_on" name="decided_on" type="date" className="field" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="conditions">{t("conditions")}</label><input id="conditions" name="conditions" className="field" /></div>
            <div><SubmitButton>{t("add")}</SubmitButton></div>
          </form>
        </details>
      </section>

      <details className="space-y-4" open={sp.edit === "1"}>
        <summary className="cursor-pointer font-serif text-xl font-semibold">{tc("edit")}</summary>
        <div className="mt-4">
          <ProjectForm project={card} targetIds={card.targetIds} parentOptions={parentOptions} />
        </div>
      </details>

      {me?.role === "super_user" ? (
        <form action={deleteProject}>
          <input type="hidden" name="id" value={card.id} />
          <button type="submit" className="text-sm font-semibold text-danger hover:underline">{children.length ? t("deleteWithChildren", { count: children.length }) : tc("delete")}</button>
        </form>
      ) : null}
    </div>
  );
}
