import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BoxType, Location, Room } from "@/lib/types";

export const getReference = cache(async () => {
  const supabase = await createClient();
  const [locations, rooms, boxTypes] = await Promise.all([
    supabase.from("locations").select("*").order("sort"),
    supabase.from("rooms").select("*").eq("archived", false).order("sort"),
    supabase.from("box_types").select("*").order("name"),
  ]);
  const locs = (locations.data ?? []) as Location[];
  const allRooms = (rooms.data ?? []) as Room[];
  const destination = locs.find((l) => l.kind === "destination");
  return {
    locations: locs,
    rooms: allRooms,
    roomById: new Map(allRooms.map((r) => [r.id, r])),
    locationById: new Map(locs.map((l) => [l.id, l])),
    destinationRooms: allRooms.filter((r) => r.location_id === destination?.id),
    boxTypes: (boxTypes.data ?? []) as BoxType[],
    defaultBoxType: ((boxTypes.data ?? []) as BoxType[]).find((b) => b.is_default) ?? null,
  };
});

export const getMe = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, email, username, display_name, role, locale").eq("id", user.id).maybeSingle();
  return data as { id: string; email: string; username: string | null; display_name: string | null; role: "super_user" | "contributor"; locale: string } | null;
});

export function roomLabel(room: Room | undefined | null, locale: string): string {
  if (!room) return "";
  return locale === "en" ? room.name_en : room.name_nl;
}

export function floorLabel(room: Room | undefined | null, locale: string): string {
  if (!room) return "";
  return locale === "en" ? room.floor_en : room.floor_nl;
}

// Short form for destination rooms, e.g. "1e Woonkamer" / "1st floor Living room".
export function destLabel(room: Room | undefined | null, locale: string): string {
  if (!room) return "";
  const prefix: Record<string, { nl: string; en: string }> = {
    BG: { nl: "BG", en: "GF" },
    "1E": { nl: "1e", en: "1F" },
    "2E": { nl: "2e", en: "2F" },
    ZO: { nl: "Zolder", en: "Attic" },
  };
  const p = prefix[room.floor_code];
  return `${p ? (locale === "en" ? p.en : p.nl) + " " : ""}${roomLabel(room, locale)}`;
}
