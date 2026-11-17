"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { moveProject } from "@/app/(app)/verbouwing/actions";

export type KanbanCard = {
  id: string;
  title: string;
  status: string;
  sort_order: number;
  phase: string;
  priority: string;
  parentTitle: string | null;
  childCount: number;
  childDone: number;
  targets: string[];
  ownerInitials: string | null;
  ownerName: string | null;
  vendorName: string | null;
  dateLabel: string;
  costLabel: string;
  blocked: boolean;
  dateConflict: boolean;
  thumbUrl: string | null;
  moodCount: number;
};

const COLUMN_TONE: Record<string, string> = {
  idee: "bg-quiet",
  te_onderzoeken: "bg-honey",
  gepland: "bg-primary",
  in_uitvoering: "bg-tangerine",
  wacht: "bg-plum-deep",
  gereed: "bg-secondary",
};

function CardBody({ card }: { card: KanbanCard }) {
  const t = useTranslations("reno");
  return (
    <div className="space-y-2">
      {card.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.thumbUrl} alt="" className="h-24 w-full rounded-lg object-cover" loading="lazy" draggable={false} />
      ) : null}
      {card.parentTitle ? <p className="truncate text-xs text-muted">↳ {card.parentTitle}</p> : null}
      <p className="text-[15px] font-semibold leading-snug">{card.title}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="chip bg-ink/5 text-ink">{t(`phaseShort.${card.phase}`)}</span>
        {card.priority === "hoog" ? <span className="chip bg-primary-tint text-primary">{t("priority.hoog")}</span> : null}
        {card.blocked ? <span className="chip bg-primary text-on-primary">{t("blocked")}</span> : null}
        {card.dateConflict ? <span className="chip bg-primary-tint text-primary">{t("dateConflictShort")}</span> : null}
        {card.childCount > 0 ? <span className="chip bg-secondary-tint text-secondary">{t("subProgress", { done: card.childDone, total: card.childCount })}</span> : null}
      </div>
      {card.targets.length > 0 ? (
        <p className="truncate text-sm text-muted">
          {card.targets.slice(0, 2).join(", ")}
          {card.targets.length > 2 ? ` +${card.targets.length - 2}` : ""}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-muted">{card.dateLabel || card.vendorName || ""}</span>
        <span className="flex shrink-0 items-center gap-2">
          {card.costLabel ? <span className="font-semibold">{card.costLabel}</span> : null}
          {card.ownerInitials ? (
            <span title={card.ownerName ?? ""} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
              {card.ownerInitials}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ card, dimmed }: { card: KanbanCard; dimmed: boolean }) {
  const t = useTranslations("reno");
  const drag = useDraggable({ id: card.id });
  const drop = useDroppable({ id: `card:${card.id}` });
  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.attributes}
      {...drag.listeners}
      aria-roledescription={t("draggable")}
      className={`relative touch-manipulation rounded-2xl border border-line bg-surface-strong p-3 shadow-[0_6px_18px_-12px_rgb(103_19_67_/_0.35)] outline-none focus-visible:ring-2 focus-visible:ring-primary ${dimmed ? "opacity-30" : ""} ${drop.isOver ? "ring-2 ring-primary/50" : ""}`}
    >
      <Link href={`/verbouwing/${card.id}`} className="block" draggable={false} onClick={(e) => drag.isDragging && e.preventDefault()}>
        <CardBody card={card} />
      </Link>
    </li>
  );
}

function Column({ status, cards, activeId, onAddHref }: { status: string; cards: KanbanCard[]; activeId: string | null; onAddHref: string }) {
  const t = useTranslations("reno");
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={t(`status.${status}`)}
      className={`flex w-[82vw] shrink-0 snap-start flex-col glass rounded-3xl p-2 sm:w-72 ${isOver ? "ring-2 ring-primary/40" : ""}`}
    >
      <header className="flex items-center justify-between px-2 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${COLUMN_TONE[status] ?? "bg-line"}`} />
          {t(`status.${status}`)}
        </span>
        <span className="text-sm text-muted">{cards.length}</span>
      </header>
      <ul className="flex min-h-24 flex-1 flex-col gap-2">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} dimmed={activeId === c.id} />
        ))}
      </ul>
      <Link href={onAddHref} className="mt-2 rounded-lg px-2 py-2 text-sm font-semibold text-primary hover:bg-surface-strong">
        + {t("addHere")}
      </Link>
    </section>
  );
}

export function KanbanBoard({ statuses, initialCards }: { statuses: readonly string[]; initialCards: KanbanCard[] }) {
  const t = useTranslations("reno");
  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Take fresh server data after a save elsewhere (revalidation re-renders the page).
  useEffect(() => setCards(initialCards), [initialCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStatus = useMemo(() => {
    const map = new Map<string, KanbanCard[]>(statuses.map((s) => [s, []]));
    for (const c of [...cards].sort((a, b) => a.sort_order - b.sort_order)) map.get(c.status)?.push(c);
    return map;
  }, [cards, statuses]);

  const active = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setError(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    let status: string;
    let sortOrder: number;
    if (over.startsWith("col:")) {
      status = over.slice(4);
      const col = (byStatus.get(status) ?? []).filter((c) => c.id !== id);
      sortOrder = (col.at(-1)?.sort_order ?? 0) + 1;
    } else {
      const targetId = over.slice(5);
      if (targetId === id) return;
      const target = cards.find((c) => c.id === targetId);
      if (!target) return;
      status = target.status;
      // Place the card just before the card it was dropped on.
      const col = (byStatus.get(status) ?? []).filter((c) => c.id !== id);
      const idx = col.findIndex((c) => c.id === targetId);
      const before = idx > 0 ? col[idx - 1].sort_order : target.sort_order - 1;
      sortOrder = (before + target.sort_order) / 2;
    }
    if (status === card.status && sortOrder === card.sort_order) return;

    const previous = cards;
    setCards((list) => list.map((c) => (c.id === id ? { ...c, status, sort_order: sortOrder } : c)));
    startTransition(async () => {
      try {
        await moveProject(id, status, sortOrder);
      } catch {
        setCards(previous);
        setError(t("moveFailed"));
      }
    });
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-3 rounded-lg bg-primary-tint px-3 py-2 text-sm">{error}</p>
      ) : null}
      <p className="mb-3 text-sm text-muted">{t("dragHint")}</p>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
          {statuses.map((s) => (
            <Column key={s} status={s} cards={byStatus.get(s) ?? []} activeId={activeId} onAddHref={`/verbouwing/nieuw?status=${s}`} />
          ))}
        </div>
        <DragOverlay>
          {active ? (
            <div className="w-72 rotate-1 rounded-2xl border border-line bg-surface-strong p-3 shadow-xl">
              <CardBody card={active} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
