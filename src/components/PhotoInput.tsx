"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

const MAX_SIDE = 1600;
const QUALITY = 0.82;

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // Browser cannot decode (e.g. HEIC outside Safari): upload as is.
  }
}

// File input that shrinks photos to max 1600 px before upload.
export function PhotoInput({ autoSubmit = false }: { autoSubmit?: boolean }) {
  const t = useTranslations("common");
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    const small = await compress(file);
    const dt = new DataTransfer();
    dt.items.add(small);
    input.files = dt.files;
    setName(`${small.name} (${Math.round(small.size / 1024)} kB)`);
    setBusy(false);
    if (autoSubmit) input.form?.requestSubmit();
  }

  return (
    <div>
      <label className="btn-secondary cursor-pointer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {busy ? t("photoBusy") : t("addPhoto")}
        <input ref={ref} type="file" name="$photo" accept="image/*" className="sr-only" onChange={onChange} />
      </label>
      {name ? <p className="mt-1 text-xs text-muted">{name}</p> : null}
    </div>
  );
}
