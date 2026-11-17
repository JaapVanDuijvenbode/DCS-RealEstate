"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/parse";
import {
  IMPACTS, INFO_STATUSES, MOOD_KINDS, PERMIT_NEEDS, PHASES, PRIORITIES, RENO_CATEGORIES, RENO_STATUSES, VERDICTS,
} from "@/lib/reno";

const optNum = z.preprocess(parseAmount, z.number().nonnegative().nullable());
const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nullable());
const optText = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(4000).nullable());
const optId = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

function revalidateReno(id?: string) {
  revalidatePath("/verbouwing");
  revalidatePath("/");
  if (id) revalidatePath(`/verbouwing/${id}`);
}

async function db() {
  return createClient();
}

// ---------------------------------------------------------------------------
// Projects and sub-items
// ---------------------------------------------------------------------------
const projectSchema = z.object({
  parent_id: optId,
  title: z.string().trim().min(1).max(160),
  description: optText,
  phase: z.enum(PHASES).default("fase_0"),
  status: z.enum(RENO_STATUSES).default("idee"),
  category: z.enum(RENO_CATEGORIES).default("noodzakelijk_herstel"),
  priority: z.enum(PRIORITIES).default("middel"),
  owner_id: optId,
  vendor_id: optId,
  start_date: optDate,
  end_date: optDate,
  estimate_eur: optNum,
  quote_eur: optNum,
  contract_eur: optNum,
  actual_eur: optNum,
  forecast_eur: optNum,
  cost_basis: optText,
  uncertainty_pct: optInt,
  monument_impact: z.enum(IMPACTS).default("onbekend"),
  permit_required: z.enum(PERMIT_NEEDS).default("te_onderzoeken"),
  permit_status: optText,
  permit_reference: optText,
  permit_submitted_on: optDate,
  permit_decided_on: optDate,
  heritage_advice: optText,
  info_status: z.enum(INFO_STATUSES).default("voorgesteld"),
});

function projectFields(formData: FormData) {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const key of Object.keys(projectSchema.shape)) {
    const v = formData.get(key);
    if (v !== null) obj[key] = v;
  }
  return projectSchema.parse(obj);
}

async function saveTargets(projectId: string, formData: FormData) {
  if (formData.get("$targets") !== "1") return;
  const supabase = await db();
  const rooms = formData.getAll("room_ids").map(String).filter(Boolean);
  const elements = formData.getAll("element_ids").map(String).filter(Boolean);
  await supabase.from("reno_project_targets").delete().eq("project_id", projectId);
  const rows = [...rooms.map((room_id) => ({ project_id: projectId, room_id })), ...elements.map((element_id) => ({ project_id: projectId, element_id }))];
  if (rows.length) {
    const { error } = await supabase.from("reno_project_targets").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function createProject(formData: FormData) {
  const data = projectFields(formData);
  const supabase = await db();
  // New cards go to the bottom of their column.
  const { data: last } = await supabase.from("reno_projects").select("sort_order").eq("status", data.status).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: row, error } = await supabase.from("reno_projects").insert({ ...data, sort_order: (last?.sort_order ?? 0) + 1 }).select("id").single();
  if (error) throw new Error(error.message);
  await saveTargets(row.id, formData);
  revalidateReno(row.id);
  if (data.parent_id) revalidatePath(`/verbouwing/${data.parent_id}`);
  // Quick-add of a sub-item stays on the parent page.
  const back = formData.get("$back");
  if (typeof back === "string" && back.startsWith("/") && !back.startsWith("//")) redirect(back);
  redirect(`/verbouwing/${row.id}`);
}

export async function updateProject(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const data = projectFields(formData);
  const supabase = await db();
  const { error } = await supabase.from("reno_projects").update(data).eq("id", id);
  if (error) throw new Error(error.message.includes("own sub-items") ? "Een project kan niet onder een eigen subitem staan." : error.message);
  await saveTargets(id, formData);
  revalidateReno(id);
  redirect(`/verbouwing/${id}?saved=1`);
}

// Called from the kanban board after a drag.
export async function moveProject(id: string, status: string, sortOrder: number) {
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(RENO_STATUSES), sortOrder: z.number().finite() }).parse({ id, status, sortOrder });
  const supabase = await db();
  const { error } = await supabase.from("reno_projects").update({ status: parsed.status, sort_order: parsed.sortOrder }).eq("id", parsed.id);
  if (error) throw new Error(error.message);
  revalidateReno(parsed.id);
}

export async function setProjectStatus(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(RENO_STATUSES).parse(formData.get("status"));
  const supabase = await db();
  const { error } = await supabase.from("reno_projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateReno(id);
}

export async function deleteProject(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await db();
  const { error } = await supabase.from("reno_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateReno();
  redirect("/verbouwing");
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------
export async function addDependency(formData: FormData) {
  const projectId = z.string().uuid().parse(formData.get("project_id"));
  const dependsOn = z.string().uuid().parse(formData.get("depends_on_id"));
  const supabase = await db();
  const { error } = await supabase.from("reno_dependencies").insert({ project_id: projectId, depends_on_id: dependsOn });
  if (error && error.code !== "23505") {
    redirect(`/verbouwing/${projectId}?dep_error=${error.message.includes("loop") ? "loop" : "other"}`);
  }
  revalidateReno(projectId);
  revalidatePath(`/verbouwing/${dependsOn}`);
}

export async function removeDependency(formData: FormData) {
  const projectId = z.string().uuid().parse(formData.get("project_id"));
  const dependsOn = z.string().uuid().parse(formData.get("depends_on_id"));
  const supabase = await db();
  await supabase.from("reno_dependencies").delete().eq("project_id", projectId).eq("depends_on_id", dependsOn);
  revalidateReno(projectId);
  revalidatePath(`/verbouwing/${dependsOn}`);
}

// ---------------------------------------------------------------------------
// Subsidies
// ---------------------------------------------------------------------------
export async function addSubsidy(formData: FormData) {
  const data = z
    .object({
      project_id: z.string().uuid(),
      scheme: z.string().trim().min(1).max(120),
      applied_eur: optNum,
      granted_eur: optNum,
      applied_on: optDate,
      decided_on: optDate,
      conditions: optText,
    })
    .parse(Object.fromEntries(formData));
  const supabase = await db();
  const { error } = await supabase.from("reno_subsidies").insert(data);
  if (error) throw new Error(error.message);
  revalidateReno(data.project_id);
}

export async function removeSubsidy(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const projectId = z.string().uuid().parse(formData.get("project_id"));
  const supabase = await db();
  const { error } = await supabase.from("reno_subsidies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateReno(projectId);
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
const vendorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trade: optText,
  contact_name: optText,
  email: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().email().nullable()),
  phone: optText,
  website: optText,
  address: optText,
  monument_experience: z.preprocess((v) => v === "on", z.boolean()),
  rating: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(5).nullable()),
  notes: optText,
});

function vendorFields(formData: FormData) {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const key of Object.keys(vendorSchema.shape)) {
    const v = formData.get(key);
    if (v !== null) obj[key] = v;
  }
  return vendorSchema.parse(obj);
}

export async function createVendor(formData: FormData) {
  const data = vendorFields(formData);
  const supabase = await db();
  const { data: row, error } = await supabase.from("vendors").insert(data).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/verbouwing/leveranciers");
  redirect(`/verbouwing/leveranciers/${row.id}?saved=1`);
}

export async function updateVendor(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const data = vendorFields(formData);
  const supabase = await db();
  const { error } = await supabase.from("vendors").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/verbouwing/leveranciers");
  revalidatePath("/verbouwing");
  redirect(`/verbouwing/leveranciers/${id}?saved=1`);
}

export async function deleteVendor(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await db();
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/verbouwing/leveranciers");
  redirect("/verbouwing/leveranciers");
}

// ---------------------------------------------------------------------------
// Mood boards
// ---------------------------------------------------------------------------
const targetSchema = z.object({ target_kind: z.enum(["room", "element", "project"]), target_id: z.string().uuid(), back: z.string().startsWith("/") });

export async function addMoodItem(formData: FormData) {
  const target = targetSchema.parse({ target_kind: formData.get("target_kind"), target_id: formData.get("target_id"), back: formData.get("back") });
  const kind = z.enum(MOOD_KINDS).parse(formData.get("kind"));
  const fields = z
    .object({
      title: optText,
      url: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().url().nullable()),
      color_code: optText,
      color_hex: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable()),
      vendor_id: optId,
      price_eur: optNum,
      note: optText,
    })
    .parse({
      title: formData.get("title") ?? "",
      url: formData.get("url") ?? "",
      color_code: formData.get("color_code") ?? "",
      color_hex: formData.get("color_hex") ?? "",
      vendor_id: formData.get("vendor_id") ?? "",
      price_eur: formData.get("price_eur") ?? "",
      note: formData.get("note") ?? "",
    });

  const supabase = await db();
  let storage_path: string | null = null;
  if (kind === "image") {
    const file = formData.get("$photo");
    if (!(file instanceof File) || file.size === 0) return;
    if (file.size > 8 * 1024 * 1024) throw new Error("Photo too large");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    storage_path = `moodboard/${target.target_kind}/${target.target_id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(storage_path, file, { contentType: file.type || "image/jpeg" });
    if (upErr) throw new Error(upErr.message);
  }
  if (kind === "link" && !fields.url) return;
  if (kind === "color" && !fields.color_code) return;
  if (kind === "material" && !fields.title) return;

  const { error } = await supabase.from("mood_items").insert({
    [`${target.target_kind}_id`]: target.target_id,
    kind,
    storage_path,
    ...fields,
  });
  if (error) throw new Error(error.message);
  revalidatePath(target.back);
  revalidatePath("/verbouwing");
}

export async function setMoodVerdict(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const verdict = z.enum(VERDICTS).parse(formData.get("verdict"));
  const back = z.string().startsWith("/").parse(formData.get("back"));
  const supabase = await db();
  const { error } = await supabase.from("mood_items").update({ verdict }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(back);
}

export async function deleteMoodItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const back = z.string().startsWith("/").parse(formData.get("back"));
  const supabase = await db();
  const { data: row } = await supabase.from("mood_items").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("mood_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (row?.storage_path) await supabase.storage.from("photos").remove([row.storage_path]);
  revalidatePath(back);
  revalidatePath("/verbouwing");
}

// ---------------------------------------------------------------------------
// Room readiness at Nieuwe Rijn 98 (super users manage rooms)
// ---------------------------------------------------------------------------
export async function setRoomReadiness(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("room_id"));
  const readiness = z.enum(["niet_gestart", "in_uitvoering", "bewoonbaar", "gereed"]).parse(formData.get("readiness"));
  const supabase = await db();
  const { error } = await supabase.from("rooms").update({ readiness }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/kamers/${id}`);
  revalidatePath("/verbouwing/ruimtes");
}
