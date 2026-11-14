import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { uploadPhoto } from "@/app/(app)/actions";
import { PhotoInput } from "@/components/PhotoInput";

type Props = { kind: "item" | "box" | "room"; targetId: string; back: string };

export async function PhotoGallery({ kind, targetId, back }: Props) {
  const t = await getTranslations("common");
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq(`${kind}_id`, targetId)
    .order("created_at", { ascending: false });
  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signed } = paths.length ? await supabase.storage.from("photos").createSignedUrls(paths, 3600) : { data: [] };

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">{t("photos")}</h2>
      {signed && signed.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {signed.map((s) =>
            s.signedUrl ? (
              <a key={s.path} href={s.signedUrl} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.signedUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </a>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("noPhotos")}</p>
      )}
      <form action={uploadPhoto}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="target_id" value={targetId} />
        <input type="hidden" name="back" value={back} />
        <PhotoInput autoSubmit />
      </form>
    </section>
  );
}
