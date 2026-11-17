import { getTranslations } from "next-intl/server";

const tone: Record<string, string> = {
  geinventariseerd: "bg-line/60 text-ink",
  ingepakt: "bg-secondary-tint text-secondary",
  geladen: "bg-secondary-tint text-secondary",
  aangekomen: "bg-secondary text-on-primary",
  uitgepakt: "bg-secondary text-on-primary",
};

export async function StatusChip({ status }: { status: string }) {
  const t = await getTranslations("status");
  return <span className={`chip ${tone[status] ?? "bg-primary-tint text-primary"}`}>{t(status)}</span>;
}
