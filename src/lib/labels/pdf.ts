import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

export type LabelData = {
  code: string;
  qrUrl: string;
  from: string;
  to: string;
  floorBand: string;      // e.g. "NAAR 1E VERDIEPING"
  floorColor: string;     // hex
  interim: string | null; // e.g. "Tijdelijk: BG Multifunctionele ruimte t/m 15-01-2027"
  contents: string;
  flags: string[];        // e.g. ["BREEKBAAR", "DEZE KANT BOVEN"]
  initials: string;
  contentsLabel: string;
  seeApp: string;
};

// A4 portrait with 4 A6 labels (105 x 148 mm) in a 2 x 2 grid.
const A4: [number, number] = [595.28, 841.89];
const LW = A4[0] / 2;
const LH = A4[1] / 2;
const M = 18;

function hex(color: string) {
  const n = parseInt(color.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Replace characters the standard PDF fonts (WinAnsi) cannot encode.
function makeSafe(font: PDFFont) {
  const cache = new Map<string, string>();
  const fallback: Record<string, string> = { "→": "->", "–": "-", "—": "-", "…": "...", "‘": "'", "’": "'", "“": '"', "”": '"' };
  return (text: string) =>
    Array.from(text)
      .map((ch) => {
        if (ch === "\n" || ch === "\r") return ch;
        if (cache.has(ch)) return cache.get(ch)!;
        let out = ch;
        try {
          font.encodeText(ch);
        } catch {
          out = fallback[ch] ?? "?";
        }
        cache.set(ch, out);
        return out;
      })
      .join("");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= width) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
        while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function drawLabel(pdf: PDFDocument, page: PDFPage, x: number, yTop: number, l: LabelData, regular: PDFFont, bold: PDFFont) {
  const safeR = makeSafe(regular);
  const safeB = makeSafe(bold);
  const ink = rgb(0.07, 0.07, 0.07);
  const grey = rgb(0.35, 0.35, 0.35);

  // Destination floor band
  const bandH = 34;
  page.drawRectangle({ x: x + M, y: yTop - M - bandH, width: LW - 2 * M, height: bandH, color: hex(l.floorColor) });
  page.drawText(safeB(l.floorBand), { x: x + M + 10, y: yTop - M - bandH + 12, size: 13, font: bold, color: rgb(1, 1, 1) });

  // QR code
  const qrSize = 104;
  const png = await QRCode.toBuffer(l.qrUrl, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 416 });
  const img = await pdf.embedPng(png);
  const qrX = x + LW - M - qrSize;
  const qrY = yTop - M - bandH - 10 - qrSize;
  page.drawImage(img, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  // Code, from, to
  const textW = qrX - (x + M) - 10;
  let y = yTop - M - bandH - 36;
  let codeSize = 28;
  while (bold.widthOfTextAtSize(l.code, codeSize) > textW && codeSize > 14) codeSize--;
  page.drawText(safeB(l.code), { x: x + M, y, size: codeSize, font: bold, color: ink });
  y -= 22;
  for (const line of wrap(safeR(l.from), regular, 10, textW).slice(0, 2)) {
    page.drawText(line, { x: x + M, y, size: 10, font: regular, color: grey });
    y -= 13;
  }
  y -= 2;
  for (const line of wrap(safeB(l.to), bold, 12, textW).slice(0, 3)) {
    page.drawText(line, { x: x + M, y, size: 12, font: bold, color: ink });
    y -= 15;
  }
  y = Math.min(y, qrY - 8);
  if (l.interim) {
    for (const line of wrap(safeR(l.interim), regular, 9.5, LW - 2 * M).slice(0, 2)) {
      page.drawText(line, { x: x + M, y, size: 9.5, font: regular, color: ink });
      y -= 12;
    }
  }

  // Divider and contents
  y -= 4;
  page.drawLine({ start: { x: x + M, y }, end: { x: x + LW - M, y }, thickness: 0.6, color: rgb(0.75, 0.75, 0.75) });
  y -= 14;
  page.drawText(safeB(l.contentsLabel.toUpperCase()), { x: x + M, y, size: 8.5, font: bold, color: grey });
  y -= 15;
  const footerY = yTop - LH + M + 4;
  const maxLines = Math.max(1, Math.floor((y - (footerY + 22)) / 14) + 1);
  const lines = wrap(safeR(l.contents || "-"), regular, 11, LW - 2 * M);
  const shown = lines.slice(0, Math.min(8, maxLines));
  if (lines.length > shown.length && shown.length > 0) shown[shown.length - 1] = `${shown[shown.length - 1].slice(0, 40)} ... ${l.seeApp}`;
  for (const line of shown) {
    page.drawText(line, { x: x + M, y, size: 11, font: regular, color: ink });
    y -= 14;
  }

  // Footer: handling flags and packer initials
  if (l.flags.length) {
    const flagText = safeB(l.flags.join(" · "));
    let size = 11;
    while (bold.widthOfTextAtSize(flagText, size) > LW - 2 * M - 40 && size > 7) size -= 0.5;
    page.drawText(flagText, { x: x + M, y: footerY, size, font: bold, color: ink });
  }
  if (l.initials) {
    const w = bold.widthOfTextAtSize(l.initials, 11);
    page.drawText(safeB(l.initials), { x: x + LW - M - w, y: footerY, size: 11, font: bold, color: grey });
  }
}

export async function buildLabelsPdf(labels: LabelData[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("LayeredCake MOVE labels");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (let i = 0; i < labels.length; i += 4) {
    const page = pdf.addPage(A4);
    // Light cut guides for plain-paper printing.
    const guide = rgb(0.85, 0.85, 0.85);
    page.drawLine({ start: { x: LW, y: 0 }, end: { x: LW, y: A4[1] }, thickness: 0.4, color: guide, dashArray: [3, 3] });
    page.drawLine({ start: { x: 0, y: LH }, end: { x: A4[0], y: LH }, thickness: 0.4, color: guide, dashArray: [3, 3] });
    const slots: [number, number][] = [[0, A4[1]], [LW, A4[1]], [0, LH], [LW, LH]];
    for (let s = 0; s < 4 && i + s < labels.length; s++) {
      await drawLabel(pdf, page, slots[s][0], slots[s][1], labels[i + s], regular, bold);
    }
  }
  return pdf.save();
}
