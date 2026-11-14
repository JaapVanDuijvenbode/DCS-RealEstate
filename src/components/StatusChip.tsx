import { getTranslations } from "next-intl/server";

const tone: Record<string, string> = {
  geinventariseerd: "bg-line/60 text-ink",
  ingepakt: "bg-canal-tint text-canal",
  geladen: "bg-canal-tint text-canal",
  aangekomen: "bg-canal text-surface",
  uitgepakt: "bg-canal text-surface",
};

export async function StatusChip({ status }: { status: string }) {
  const t = await getTranslations("status");
  return <span className={`chip ${tone[status] ?? "bg-brick-tint text-brick"}`}>{t(status)}</span>;
}
