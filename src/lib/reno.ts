import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getReference } from "@/lib/data";

export const PHASES = ["fase_0", "fase_1", "fase_2", "fase_3", "fase_4", "fase_5"] as const;
export const RENO_STATUSES = ["idee", "te_onderzoeken", "gepland", "in_uitvoering", "wacht", "gereed"] as const;
export const RENO_CATEGORIES = ["noodzakelijk_herstel", "preventief_onderhoud", "comfort", "esthetisch"] as const;
export const PRIORITIES = ["laag", "middel", "hoog"] as const;
export const IMPACTS = ["geen", "laag", "hoog", "onbekend"] as const;
export const PERMIT_NEEDS = ["ja", "nee", "te_onderzoeken"] as const;
export const INFO_STATUSES = ["vastgesteld", "aannemelijk", "onbekend", "te_onderzoeken", "besloten", "voorgesteld"] as const;
export const MOOD_KINDS = ["image", "link", "color", "material"] as const;
export const VERDICTS = ["favoriet", "optie", "afgewezen"] as const;
export const VENDOR_TRADES = ["architect", "constructeur", "aannemer", "restauratie", "schilder", "installateur", "elektricien", "loodgieter", "dakdekker", "timmerman", "leverancier", "adviseur", "overig"] as const;

export type RenoStatus = (typeof RENO_STATUSES)[number];
export type RenoPhase = (typeof PHASES)[number];

// Bar colour per phase on the timeline (palette B, distinct in lightness).
export const PHASE_COLORS: Record<RenoPhase, string> = {
  fase_0: "#8A9097",
  fase_1: "#9A3B28",
  fase_2: "#C46A4E",
  fase_3: "#2F5D50",
  fase_4: "#5E8C7E",
  fase_5: "#4A4F57",
};

export type RenoProject = {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  phase: RenoPhase;
  status: RenoStatus;
  category: string;
  priority: string;
  sort_order: number;
  owner_id: string | null;
  vendor_id: string | null;
  start_date: string | null;
  end_date: string | null;
  estimate_eur: number | null;
  quote_eur: number | null;
  contract_eur: number | null;
  actual_eur: number | null;
  forecast_eur: number | null;
  cost_basis: string | null;
  uncertainty_pct: number | null;
  monument_impact: string;
  permit_required: string;
  permit_status: string | null;
  permit_reference: string | null;
  permit_submitted_on: string | null;
  permit_decided_on: string | null;
  heritage_advice: string | null;
  info_status: string;
};

export type Vendor = {
  id: string;
  name: string;
  trade: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  monument_experience: boolean;
  rating: number | null;
  notes: string | null;
};

export type BuildingElement = { id: string; location_id: string; code: string; name_nl: string; name_en: string; sort: number };

export type Member = { id: string; email: string; display_name: string | null; username: string | null };

// A project enriched for the board, list and timeline views.
export type BoardCard = RenoProject & {
  parentTitle: string | null;
  childCount: number;
  childDone: number;
  targets: string[];            // display names of rooms / elements
  targetIds: string[];          // room or element ids
  ownerName: string | null;
  ownerInitials: string | null;
  vendorName: string | null;
  dependsOn: string[];          // project ids
  blockedBy: string[];          // titles of unfinished dependencies
  dateConflict: boolean;        // starts before a dependency ends
  thumbUrl: string | null;
  moodCount: number;
};

export function memberName(m: Member | undefined | null): string | null {
  if (!m) return null;
  return m.display_name || m.username || m.email;
}

export function initials(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

export const getRenoReference = cache(async () => {
  const supabase = await createClient();
  const [elements, vendors, members] = await Promise.all([
    supabase.from("building_elements").select("*").order("sort"),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("profiles").select("id, email, display_name, username").order("display_name"),
  ]);
  const els = (elements.data ?? []) as BuildingElement[];
  const vs = (vendors.data ?? []) as Vendor[];
  const ms = (members.data ?? []) as Member[];
  return {
    elements: els,
    elementById: new Map(els.map((e) => [e.id, e])),
    vendors: vs,
    vendorById: new Map(vs.map((v) => [v.id, v])),
    members: ms,
    memberById: new Map(ms.map((m) => [m.id, m])),
  };
});

export function elementLabel(e: BuildingElement | undefined | null, locale: string) {
  if (!e) return "";
  return locale === "en" ? e.name_en : e.name_nl;
}

export const getBoard = cache(async (locale: string) => {
  const supabase = await createClient();
  const { roomById } = await getReference();
  const { elementById, vendorById, memberById } = await getRenoReference();

  const [projects, targets, deps, moods] = await Promise.all([
    supabase.from("reno_projects").select("*").order("sort_order"),
    supabase.from("reno_project_targets").select("project_id, room_id, element_id"),
    supabase.from("reno_dependencies").select("project_id, depends_on_id"),
    supabase.from("mood_items").select("project_id, storage_path, kind, created_at").not("project_id", "is", null).order("created_at", { ascending: false }),
  ]);
  const rows = (projects.data ?? []) as RenoProject[];
  const byId = new Map(rows.map((p) => [p.id, p]));

  const thumbPathByProject = new Map<string, string>();
  const moodCount = new Map<string, number>();
  for (const m of moods.data ?? []) {
    moodCount.set(m.project_id, (moodCount.get(m.project_id) ?? 0) + 1);
    if (m.kind === "image" && m.storage_path && !thumbPathByProject.has(m.project_id)) thumbPathByProject.set(m.project_id, m.storage_path);
  }
  const paths = [...thumbPathByProject.values()];
  const signed = paths.length ? (await supabase.storage.from("photos").createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const cards: BoardCard[] = rows.map((p) => {
    const children = rows.filter((c) => c.parent_id === p.id);
    const myTargets = (targets.data ?? []).filter((t) => t.project_id === p.id);
    const myDeps = (deps.data ?? []).filter((d) => d.project_id === p.id).map((d) => d.depends_on_id);
    const depProjects = myDeps.map((id) => byId.get(id)).filter(Boolean) as RenoProject[];
    const owner = memberById.get(p.owner_id ?? "");
    const ownerName = memberName(owner);
    const thumbPath = thumbPathByProject.get(p.id);
    return {
      ...p,
      parentTitle: p.parent_id ? byId.get(p.parent_id)?.title ?? null : null,
      childCount: children.length,
      childDone: children.filter((c) => c.status === "gereed").length,
      targets: myTargets.map((t) =>
        t.room_id
          ? (() => {
              const r = roomById.get(t.room_id);
              const prefix: Record<string, string> = { BG: "BG", "1E": locale === "en" ? "1F" : "1e", "2E": locale === "en" ? "2F" : "2e", ZO: locale === "en" ? "Attic" : "Zolder" };
              return r ? `${prefix[r.floor_code] ?? ""} ${locale === "en" ? r.name_en : r.name_nl}`.trim() : "";
            })()
          : elementLabel(elementById.get(t.element_id ?? ""), locale),
      ),
      targetIds: myTargets.map((t) => (t.room_id ?? t.element_id) as string),
      ownerName,
      ownerInitials: initials(ownerName),
      vendorName: vendorById.get(p.vendor_id ?? "")?.name ?? null,
      dependsOn: myDeps,
      blockedBy: depProjects.filter((d) => d.status !== "gereed").map((d) => d.title),
      dateConflict: !!p.start_date && depProjects.some((d) => d.end_date && d.end_date >= p.start_date!),
      thumbUrl: thumbPath ? urlByPath.get(thumbPath) ?? null : null,
      moodCount: moodCount.get(p.id) ?? 0,
    };
  });
  return { cards, byId: new Map(cards.map((c) => [c.id, c])) };
});

export function formatEur(value: number | null | undefined, locale: string) {
  if (value == null) return "";
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value));
}

export function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

// Best available cost figure: forecast, contract, quote, estimate.
export function bestCost(p: Pick<RenoProject, "forecast_eur" | "contract_eur" | "quote_eur" | "estimate_eur">): number | null {
  return p.forecast_eur ?? p.contract_eur ?? p.quote_eur ?? p.estimate_eur ?? null;
}
