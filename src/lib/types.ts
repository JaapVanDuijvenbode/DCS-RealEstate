import type { Disposition, MoveStatus } from "@/lib/constants";

export type Location = { id: string; code: string; name: string; address: string | null; kind: "source" | "destination"; sort: number };

export type Room = {
  id: string;
  location_id: string;
  code: string;
  name_nl: string;
  name_en: string;
  floor_code: string;
  floor_nl: string;
  floor_en: string;
  sort: number;
  readiness: string;
  default_dest_room_id: string | null;
  default_interim_room_id: string | null;
  default_interim_until: string | null;
};

export type BoxType = { id: string; name: string; outer_l_cm: number; outer_w_cm: number; outer_h_cm: number; wall_cm: number; max_kg: number; is_default: boolean };

export type Item = {
  id: string;
  room_id: string;
  dest_room_id: string | null;
  interim_room_id: string | null;
  interim_until: string | null;
  name: string;
  category: string;
  quantity: number;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fragile: boolean;
  value_eur: number | null;
  disposition: Disposition;
  status: MoveStatus;
  notes: string | null;
  asking_price_eur: number | null;
  sale_platform: string | null;
  listing_url: string | null;
  buyer: string | null;
  sale_price_eur: number | null;
  sale_status: string | null;
};

export type Box = {
  id: string;
  code: string;
  seq: number;
  room_id: string;
  dest_room_id: string | null;
  interim_room_id: string | null;
  interim_until: string | null;
  box_type_id: string | null;
  contents: string;
  weight_kg: number | null;
  value_eur: number | null;
  fragile: boolean;
  heavy: boolean;
  this_side_up: boolean;
  disposition: Disposition;
  status: MoveStatus;
  packed_by: string | null;
  notes: string | null;
  created_at: string;
};
