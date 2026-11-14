import type { Room } from "@/lib/types";
import { roomLabel } from "@/lib/data";

type Props = {
  name: string;
  id?: string;
  rooms: Room[];
  locale: string;
  defaultValue?: string | null;
  emptyLabel: string;
};

// Destination rooms grouped by floor.
export function RoomSelect({ name, id, rooms, locale, defaultValue, emptyLabel }: Props) {
  const floors: { key: string; label: string; rooms: Room[] }[] = [];
  for (const r of rooms) {
    let group = floors.find((f) => f.key === r.floor_code);
    if (!group) {
      group = { key: r.floor_code, label: locale === "en" ? r.floor_en : r.floor_nl, rooms: [] };
      floors.push(group);
    }
    group.rooms.push(r);
  }
  return (
    <select name={name} id={id ?? name} className="field" defaultValue={defaultValue ?? ""}>
      <option value="">{emptyLabel}</option>
      {floors.map((f) => (
        <optgroup key={f.key} label={f.label}>
          {f.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {roomLabel(r, locale)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
