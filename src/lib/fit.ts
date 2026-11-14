import type { BoxType } from "@/lib/types";

export type FitResult =
  | { kind: "unknown" }
  | { kind: "fits" }
  | { kind: "too_big" }
  | { kind: "too_heavy" };

// Simple check (PRD A3): does a loose item fit in the box in any orientation,
// and stay under the weight limit? Sorting both sides covers all 6 rotations
// for axis-aligned boxes.
export function fitCheck(
  dims: { length_cm: number | null; width_cm: number | null; height_cm: number | null; weight_kg: number | null },
  box: Pick<BoxType, "outer_l_cm" | "outer_w_cm" | "outer_h_cm" | "wall_cm" | "max_kg">,
): FitResult {
  const { length_cm, width_cm, height_cm, weight_kg } = dims;
  if (!length_cm || !width_cm || !height_cm) return { kind: "unknown" };
  const inner = [box.outer_l_cm, box.outer_w_cm, box.outer_h_cm].map((d) => Number(d) - 2 * Number(box.wall_cm)).sort((a, b) => b - a);
  const item = [length_cm, width_cm, height_cm].map(Number).sort((a, b) => b - a);
  if (!item.every((d, i) => d <= inner[i])) return { kind: "too_big" };
  if (weight_kg && Number(weight_kg) > Number(box.max_kg)) return { kind: "too_heavy" };
  return { kind: "fits" };
}

export function innerVolumeM3(box: Pick<BoxType, "outer_l_cm" | "outer_w_cm" | "outer_h_cm">): number {
  return (Number(box.outer_l_cm) * Number(box.outer_w_cm) * Number(box.outer_h_cm)) / 1_000_000;
}
