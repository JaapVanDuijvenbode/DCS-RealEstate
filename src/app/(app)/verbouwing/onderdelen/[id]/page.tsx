import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { elementLabel, getRenoReference } from "@/lib/reno";
import { TargetProjects } from "@/components/reno/TargetProjects";
import { MoodBoard } from "@/components/reno/MoodBoard";

export default async function ElementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("reno");
  const locale = await getLocale();
  const { elementById } = await getRenoReference();
  const element = elementById.get(id);
  if (!element) notFound();
  return (
    <div className="space-y-6">
      <Link href="/verbouwing/ruimtes" className="text-sm text-primary">← {t("roomsAndElements")}</Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">{elementLabel(element, locale)}</h1>
        <p className="mt-1 text-muted">Nieuwe Rijn 98 · {t("element")}</p>
      </div>
      <TargetProjects targetId={element.id} />
      <MoodBoard kind="element" targetId={element.id} back={`/verbouwing/onderdelen/${element.id}`} />
    </div>
  );
}
