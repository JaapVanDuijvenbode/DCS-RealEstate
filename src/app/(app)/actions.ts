"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, DISPOSITIONS, SALE_STATUSES, STATUSES } from "@/lib/constants";
import { env } from "@/lib/env";
import { LOCALE_COOKIE } from "@/i18n/request";

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------
const optNum = z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().nonnegative().nullable());
const optText = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(2000).nullable());
const optId = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());
const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());

function fields(formData: FormData) {
  const obj: Record<string, FormDataEntryValue> = {};
  formData.forEach((v, k) => {
    if (!k.startsWith("$")) obj[k] = v;
  });
  return obj;
}

// ---------------------------------------------------------------------------
// Furniture and appliances
// ---------------------------------------------------------------------------
const itemSchema = z.object({
  room_id: z.string().uuid(),
  dest_room_id: optId,
  interim_room_id: optId,
  interim_until: optDate,
  name: z.string().trim().min(1).max(120),
  category: z.enum(CATEGORIES).default("meubel"),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  length_cm: optNum,
  width_cm: optNum,
  height_cm: optNum,
  weight_kg: optNum,
  fragile: bool,
  value_eur: optNum,
  disposition: z.enum(DISPOSITIONS),
  status: z.enum(STATUSES).optional(),
  notes: optText,
  asking_price_eur: optNum.optional(),
  sale_platform: optText.optional(),
  listing_url: optText.optional(),
  buyer: optText.optional(),
  sale_price_eur: optNum.optional(),
  sale_status: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(SALE_STATUSES).nullable()).optional(),
});

export async function createItem(formData: FormData) {
  const data = itemSchema.parse(fields(formData));
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("items").insert(data).select("id").single();
  if (error) throw new Error(error.message);
  await attachUploadedPhoto(formData, { item_id: row.id });
  revalidatePath(`/kamers/${data.room_id}`);
  revalidatePath("/");
}

export async function updateItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const data = itemSchema.parse(fields(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("items").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/meubels/${id}`);
  revalidatePath(`/kamers/${data.room_id}`);
  redirect(`/kamers/${data.room_id}`);
}

export async function deleteItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const roomId = z.string().uuid().parse(formData.get("room_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/kamers/${roomId}`);
  redirect(`/kamers/${roomId}`);
}

// ---------------------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------------------
const boxSchema = z.object({
  room_id: z.string().uuid(),
  dest_room_id: optId,
  interim_room_id: optId,
  interim_until: optDate,
  box_type_id: optId,
  contents: z.string().trim().max(1000).default(""),
  weight_kg: optNum,
  value_eur: optNum,
  fragile: bool,
  heavy: bool,
  this_side_up: bool,
  disposition: z.enum(DISPOSITIONS).default("zelf"),
  status: z.enum(STATUSES).optional(),
  notes: optText,
});

export async function createBox(formData: FormData) {
  const data = boxSchema.parse(fields(formData));
  const count = Math.min(Math.max(Number(formData.get("$count") ?? 1) || 1, 1), 50);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  for (let i = 0; i < count; i++) {
    const { error } = await supabase.from("boxes").insert({ ...data, packed_by: user?.id ?? null });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/kamers/${data.room_id}`);
  revalidatePath("/dozen");
  revalidatePath("/");
}

export async function updateBox(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const data = boxSchema.parse(fields(formData));
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("boxes").update(data).eq("id", id).select("code").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/d/${row.code}`);
  revalidatePath(`/kamers/${data.room_id}`);
  revalidatePath("/dozen");
  redirect(`/d/${row.code}?saved=1`);
}

export async function setBoxStatus(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(STATUSES).parse(formData.get("status"));
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("boxes").update({ status }).eq("id", id).select("code, room_id").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/d/${row.code}`);
  revalidatePath(`/kamers/${row.room_id}`);
  revalidatePath("/");
}

export async function deleteBox(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const roomId = z.string().uuid().parse(formData.get("room_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("boxes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/kamers/${roomId}`);
  redirect(`/kamers/${roomId}`);
}

// ---------------------------------------------------------------------------
// Photos (compressed in the browser, stored in the private "photos" bucket)
// ---------------------------------------------------------------------------
type PhotoTarget = { item_id?: string; box_id?: string; room_id?: string };

async function attachUploadedPhoto(formData: FormData, target: PhotoTarget) {
  const file = formData.get("$photo");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) throw new Error("Photo too large");
  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const folder = target.item_id ? "items" : target.box_id ? "boxes" : "rooms";
  const path = `${folder}/${target.item_id ?? target.box_id ?? target.room_id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (upErr) throw new Error(upErr.message);
  const { error } = await supabase.from("photos").insert({ storage_path: path, ...target });
  if (error) throw new Error(error.message);
}

export async function uploadPhoto(formData: FormData) {
  const kind = z.enum(["item", "box", "room"]).parse(formData.get("kind"));
  const id = z.string().uuid().parse(formData.get("target_id"));
  const back = String(formData.get("back") ?? "/");
  await attachUploadedPhoto(formData, { [`${kind}_id`]: id } as PhotoTarget);
  revalidatePath(back);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function setLocale(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "nl";
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ locale }).eq("id", user.id);
  revalidatePath("/", "layout");
}

export async function updateDisplayName(formData: FormData) {
  const name = z.string().trim().min(1).max(60).parse(formData.get("display_name"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  revalidatePath("/instellingen");
}

export async function inviteUser(formData: FormData) {
  const email = z.string().trim().toLowerCase().email().parse(formData.get("email"));
  const role = z.enum(["super_user", "contributor"]).parse(formData.get("role"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  if (me?.role !== "super_user") throw new Error("Only super users can invite");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${env.appUrl}/auth/confirm?next=/wachtwoord` });
  if (error) throw new Error(error.message);
  await admin.from("profiles").update({ role }).eq("email", email);
  revalidatePath("/instellingen");
  redirect("/instellingen?invited=1");
}
