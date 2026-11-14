import { NextResponse, type NextRequest } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { destLabel, getReference, roomLabel } from "@/lib/data";
import { FLOOR_COLORS, STATUSES } from "@/lib/constants";
import { buildLabelsPdf, type LabelData } from "@/lib/labels/pdf";
import { env } from "@/lib/env";
import type { Box } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/labels?box=<id> | room=<id> | location=<id>[&status=..][&missing=1]
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const t = await getTranslations("labels");
  const locale = await getLocale();
  const { rooms, roomById, locationById } = await getReference();

  let query = supabase.from("boxes").select("*").order("code");
  if (sp.get("box")) query = query.eq("id", sp.get("box")!);
  else if (sp.get("room")) query = query.eq("room_id", sp.get("room")!);
  else if (sp.get("location")) query = query.in("room_id", rooms.filter((r) => r.location_id === sp.get("location")).map((r) => r.id));
  const status = sp.get("status");
  if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (sp.get("missing")) query = query.is("dest_room_id", null);

  const { data, error } = await query.limit(400);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const boxes = (data ?? []) as Box[];
  if (boxes.length === 0) return NextResponse.json({ error: "no boxes" }, { status: 404 });

  const packerIds = [...new Set(boxes.map((b) => b.packed_by).filter(Boolean))] as string[];
  const { data: packers } = packerIds.length ? await supabase.from("profiles").select("id, display_name, email").in("id", packerIds) : { data: [] };
  const initialsById = new Map((packers ?? []).map((p) => [p.id, (p.display_name ?? p.email).slice(0, 2).toUpperCase()]));

  const labels: LabelData[] = boxes.map((b) => {
    const room = roomById.get(b.room_id);
    const loc = locationById.get(room?.location_id ?? "");
    const dest = roomById.get(b.dest_room_id ?? "");
    const interim = roomById.get(b.interim_room_id ?? "");
    const floorName = dest ? (locale === "en" ? dest.floor_en : dest.floor_nl) : t("unknownFloor");
    const flags = [b.fragile && t("fragile"), b.this_side_up && t("thisSideUp"), b.heavy && t("heavy")].filter(Boolean) as string[];
    return {
      code: b.code,
      qrUrl: `${env.appUrl}/d/${b.code}`,
      from: `${t("from")}: ${loc?.name ?? ""}, ${roomLabel(room, locale)}`,
      to: `${t("to")}: Nieuwe Rijn 98, ${dest ? destLabel(dest, locale) : t("toDecide")}`,
      floorBand: `${t("toFloor")} ${floorName}`.toUpperCase(),
      floorColor: FLOOR_COLORS[dest?.floor_code ?? "EXT"] ?? "#4A4F57",
      interim: interim
        ? `${t("interim")}: ${destLabel(interim, locale)}${b.interim_until ? ` ${t("until")} ${b.interim_until.split("-").reverse().join("-")}` : ""}`
        : null,
      contents: b.contents,
      flags,
      initials: initialsById.get(b.packed_by ?? "") ?? "",
      contentsLabel: t("contents"),
      seeApp: t("seeApp"),
    };
  });

  const bytes = await buildLabelsPdf(labels);
  const name = boxes.length === 1 ? `label-${boxes[0].code}.pdf` : `labels-${boxes.length}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
