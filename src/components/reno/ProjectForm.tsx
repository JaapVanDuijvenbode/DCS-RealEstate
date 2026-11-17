import { getLocale, getTranslations } from "next-intl/server";
import { getReference, roomLabel } from "@/lib/data";
import {
  IMPACTS, INFO_STATUSES, PERMIT_NEEDS, PHASES, PRIORITIES, RENO_CATEGORIES, RENO_STATUSES,
  elementLabel, getRenoReference, type RenoProject,
} from "@/lib/reno";
import { createProject, updateProject } from "@/app/(app)/verbouwing/actions";
import { SubmitButton } from "@/components/SubmitButton";

type Props = {
  project?: RenoProject | null;
  defaults?: Partial<RenoProject>;
  targetIds?: string[];
  parentOptions: { id: string; title: string }[];
};

const val = (v: number | string | null | undefined) => (v == null ? "" : String(v));

export async function ProjectForm({ project, defaults = {}, targetIds = [], parentOptions }: Props) {
  const t = await getTranslations("reno");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { destinationRooms } = await getReference();
  const { elements, vendors, members } = await getRenoReference();
  const p: Partial<RenoProject> = { phase: "fase_0", status: "idee", category: "noodzakelijk_herstel", priority: "middel", monument_impact: "onbekend", permit_required: "te_onderzoeken", info_status: "voorgesteld", ...defaults, ...(project ?? {}) };
  const selected = new Set(targetIds);

  const floors: { key: string; label: string; rooms: typeof destinationRooms }[] = [];
  for (const r of destinationRooms) {
    let g = floors.find((f) => f.key === r.floor_code);
    if (!g) floors.push((g = { key: r.floor_code, label: locale === "en" ? r.floor_en : r.floor_nl, rooms: [] }));
    g.rooms.push(r);
  }

  const select = (name: keyof RenoProject, options: readonly string[], ns: string) => (
    <select id={name} name={name} className="field" defaultValue={val(p[name] as string)}>
      {options.map((o) => <option key={o} value={o}>{t(`${ns}.${o}`)}</option>)}
    </select>
  );

  return (
    <form action={project ? updateProject : createProject} className="space-y-4">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <input type="hidden" name="$targets" value="1" />

      <section className="card space-y-3 p-5">
        <div>
          <label className="label" htmlFor="title">{t("titleField")}</label>
          <input id="title" name="title" className="field" defaultValue={val(p.title)} required maxLength={160} />
        </div>
        <div>
          <label className="label" htmlFor="description">{t("description")}</label>
          <textarea id="description" name="description" rows={3} className="field" defaultValue={val(p.description)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="parent_id">{t("parent")}</label>
            <select id="parent_id" name="parent_id" className="field" defaultValue={val(p.parent_id)}>
              <option value="">{t("noParent")}</option>
              {parentOptions.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="phase">{t("phaseLabel")}</label>
            {select("phase", PHASES, "phase")}
          </div>
          <div>
            <label className="label" htmlFor="status">{t("statusLabel")}</label>
            {select("status", RENO_STATUSES, "status")}
          </div>
          <div>
            <label className="label" htmlFor="category">{t("categoryLabel")}</label>
            {select("category", RENO_CATEGORIES, "category")}
          </div>
          <div>
            <label className="label" htmlFor="priority">{t("priorityLabel")}</label>
            {select("priority", PRIORITIES, "priority")}
          </div>
          <div>
            <label className="label" htmlFor="info_status">{t("infoStatusLabel")}</label>
            {select("info_status", INFO_STATUSES, "info")}
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-lg font-semibold">{t("planning")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="start_date">{t("start")}</label>
            <input id="start_date" name="start_date" type="date" className="field" defaultValue={val(p.start_date)} />
          </div>
          <div>
            <label className="label" htmlFor="end_date">{t("end")}</label>
            <input id="end_date" name="end_date" type="date" className="field" defaultValue={val(p.end_date)} />
          </div>
          <div>
            <label className="label" htmlFor="owner_id">{t("owner")}</label>
            <select id="owner_id" name="owner_id" className="field" defaultValue={val(p.owner_id)}>
              <option value="">{tc("none")}</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.display_name ?? m.email}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="vendor_id">{t("vendor")}</label>
            <select id="vendor_id" name="vendor_id" className="field" defaultValue={val(p.vendor_id)}>
              <option value="">{tc("none")}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.trade ? ` (${t(`trade.${v.trade}`)})` : ""}</option>)}
            </select>
          </div>
        </div>
      </section>

      <details className="card p-5" open={selected.size > 0 || !project}>
        <summary className="cursor-pointer font-serif text-lg font-semibold">{t("targets")}{selected.size ? ` (${selected.size})` : ""}</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {floors.map((f) => (
            <fieldset key={f.key}>
              <legend className="mb-1 text-sm font-semibold text-muted">{f.label}</legend>
              {f.rooms.map((r) => (
                <label key={r.id} className="flex min-h-9 items-center gap-2 text-[15px]">
                  <input type="checkbox" name="room_ids" value={r.id} defaultChecked={selected.has(r.id)} className="h-5 w-5 accent-[var(--brick)]" />
                  {roomLabel(r, locale)}
                </label>
              ))}
            </fieldset>
          ))}
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-muted">{t("elements")}</legend>
            {elements.map((e) => (
              <label key={e.id} className="flex min-h-9 items-center gap-2 text-[15px]">
                <input type="checkbox" name="element_ids" value={e.id} defaultChecked={selected.has(e.id)} className="h-5 w-5 accent-[var(--brick)]" />
                {elementLabel(e, locale)}
              </label>
            ))}
          </fieldset>
        </div>
      </details>

      <details className="card p-5" open={!!(p.estimate_eur || p.quote_eur || p.contract_eur)}>
        <summary className="cursor-pointer font-serif text-lg font-semibold">{t("costs")}</summary>
        <p className="mt-1 text-sm text-muted">{t("costsHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(["estimate_eur", "quote_eur", "contract_eur", "actual_eur", "forecast_eur"] as const).map((k) => (
            <div key={k}>
              <label className="label" htmlFor={k}>{t(`cost.${k}`)}</label>
              <input id={k} name={k} inputMode="decimal" className="field" defaultValue={val(p[k])} />
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label className="label" htmlFor="cost_basis">{t("costBasis")}</label>
            <input id="cost_basis" name="cost_basis" className="field" defaultValue={val(p.cost_basis)} placeholder={t("costBasisHint")} />
          </div>
          <div>
            <label className="label" htmlFor="uncertainty_pct">{t("uncertainty")}</label>
            <input id="uncertainty_pct" name="uncertainty_pct" type="number" min={0} max={200} className="field" defaultValue={val(p.uncertainty_pct)} />
          </div>
        </div>
      </details>

      <details className="card p-5" open={p.permit_required === "ja"}>
        <summary className="cursor-pointer font-serif text-lg font-semibold">{t("monument")}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="monument_impact">{t("impactLabel")}</label>
            {select("monument_impact", IMPACTS, "impact")}
          </div>
          <div>
            <label className="label" htmlFor="permit_required">{t("permitLabel")}</label>
            {select("permit_required", PERMIT_NEEDS, "permit")}
          </div>
          <div>
            <label className="label" htmlFor="permit_status">{t("permitStatus")}</label>
            <input id="permit_status" name="permit_status" className="field" defaultValue={val(p.permit_status)} />
          </div>
          <div>
            <label className="label" htmlFor="permit_reference">{t("permitReference")}</label>
            <input id="permit_reference" name="permit_reference" className="field" defaultValue={val(p.permit_reference)} />
          </div>
          <div>
            <label className="label" htmlFor="permit_submitted_on">{t("permitSubmitted")}</label>
            <input id="permit_submitted_on" name="permit_submitted_on" type="date" className="field" defaultValue={val(p.permit_submitted_on)} />
          </div>
          <div>
            <label className="label" htmlFor="permit_decided_on">{t("permitDecided")}</label>
            <input id="permit_decided_on" name="permit_decided_on" type="date" className="field" defaultValue={val(p.permit_decided_on)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="heritage_advice">{t("heritageAdvice")}</label>
          <textarea id="heritage_advice" name="heritage_advice" rows={2} className="field" defaultValue={val(p.heritage_advice)} />
        </div>
      </details>

      <SubmitButton>{project ? tc("save") : t("create")}</SubmitButton>
    </form>
  );
}
