import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { RENO_STATUSES, type RenoProject, type RenoStatus } from "@/lib/reno";
import { ProjectForm } from "@/components/reno/ProjectForm";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ parent?: string; status?: string; target?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("reno");
  const supabase = await createClient();
  const { data } = await supabase.from("reno_projects").select("id, title, parent_id, phase").order("sort_order");
  const projects = (data ?? []) as Pick<RenoProject, "id" | "title" | "parent_id" | "phase">[];
  const parent = projects.find((p) => p.id === sp.parent);
  const status = (RENO_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as RenoStatus) : "idee";

  return (
    <div className="space-y-5">
      <Link href={parent ? `/verbouwing/${parent.id}` : "/verbouwing"} className="text-sm text-brick">← {parent ? parent.title : t("title")}</Link>
      <h1 className="font-serif text-3xl font-semibold">{parent ? t("newSubItem") : t("newProject")}</h1>
      <ProjectForm
        defaults={{ parent_id: parent?.id ?? null, phase: parent?.phase ?? "fase_0", status }}
        targetIds={sp.target ? [sp.target] : []}
        parentOptions={projects.map((p) => ({ id: p.id, title: p.title }))}
      />
    </div>
  );
}
