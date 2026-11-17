"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export type LightboxImage = { src: string; alt?: string; caption?: string | null };

type Ctx = { open: (index: number, trigger?: HTMLElement | null) => void };
const LightboxContext = createContext<Ctx | null>(null);

// Wrap a set of photos; any LightboxTrigger inside opens the set at its index.
export function LightboxProvider({ images, children }: { images: LightboxImage[]; children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const open = useCallback((i: number, trigger?: HTMLElement | null) => {
    triggerRef.current = trigger ?? null;
    setIndex(i);
  }, []);
  const close = useCallback(() => {
    setIndex(null);
    triggerRef.current?.focus();
  }, []);
  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      {index !== null && images.length > 0 ? <LightboxDialog images={images} start={Math.min(index, images.length - 1)} onClose={close} /> : null}
    </LightboxContext.Provider>
  );
}

export function LightboxTrigger({ index, label, className = "", children }: { index: number; label: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(LightboxContext);
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      onClick={(e) => ctx?.open(index, e.currentTarget)}
      className={`group relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${className}`}
    >
      {children}
    </button>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function LightboxDialog({ images, start, onClose }: { images: LightboxImage[]; start: number; onClose: () => void }) {
  const t = useTranslations("common");
  const [current, setCurrent] = useState(start);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const multiple = images.length > 1;

  const goTo = useCallback((i: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.max(0, Math.min(images.length - 1, i));
    track.scrollTo({ left: target * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, [images.length]);

  // Open at the chosen photo, lock page scroll, focus the close button.
  useEffect(() => {
    goTo(start, false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [start, goTo]);

  // Keep the photo aligned when the window is resized or rotated.
  useEffect(() => {
    const onResize = () => goTo(current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [current, goTo]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    thumbsRef.current?.querySelector<HTMLElement>(`[data-thumb="${current}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [current]);

  function onScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== current) setCurrent(i);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  const img = images[current];

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("photoOf", { current: current + 1, total: images.length })}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-[rgb(28_13_22_/_0.55)] text-white backdrop-blur-2xl backdrop-saturate-150"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tabular-nums" aria-live="polite">
          {current + 1} / {images.length}
        </span>
        <div className="flex items-center gap-2">
          <a href={img.src} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">
            <Icon d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" />
            <span className="hidden sm:inline">{t("openOriginal")}</span>
          </a>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("close")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
      </div>

      {/* Slides: scroll, swipe or use the arrows */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((im, i) => (
            <div
              key={`${im.src}-${i}`}
              className="flex h-full w-full shrink-0 snap-center items-center justify-center p-3 sm:p-6"
              onClick={(e) => e.target === e.currentTarget && onClose()}
            >
              <img
                src={im.src}
                alt={im.alt ?? ""}
                loading={Math.abs(i - current) <= 1 ? "eager" : "lazy"}
                draggable={false}
                className="max-h-full max-w-full select-none rounded-2xl object-contain shadow-[0_30px_80px_-30px_rgb(0_0_0_/_0.8)]"
              />
            </div>
          ))}
        </div>
        {multiple ? (
          <>
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              aria-label={t("previous")}
              className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 sm:flex"
            >
              <Icon d="M15 5l-7 7 7 7" />
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={current === images.length - 1}
              aria-label={t("next")}
              className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 sm:flex"
            >
              <Icon d="M9 5l7 7-7 7" />
            </button>
          </>
        ) : null}
      </div>

      {/* Caption and thumbnails */}
      <div className="space-y-3 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
        {img.caption ? <p className="mx-auto max-w-2xl text-center text-[15px] text-white/90">{img.caption}</p> : null}
        {multiple ? (
          <div ref={thumbsRef} className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:thin]">
            {images.map((im, i) => (
              <button
                key={`t-${im.src}-${i}`}
                type="button"
                data-thumb={i}
                onClick={() => goTo(i)}
                aria-label={t("photoOf", { current: i + 1, total: images.length })}
                aria-current={i === current ? "true" : undefined}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === current ? "ring-white" : "opacity-60 ring-transparent hover:opacity-100"}`}
              >
                <img src={im.src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
