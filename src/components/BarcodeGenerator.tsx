"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { FiDownload, FiImage } from "react-icons/fi";
import { MdBarcodeReader } from "react-icons/md";
import {
  ean13Checksum,
  isValidEan13,
  ean13Pattern,
  code128Encode,
  EAN13_MODULES,
} from "@/lib/barcode";

interface Props { locale?: string; }

type Symbology = "ean13" | "code128";

const MODULE_STEP_OPTIONS = [2, 3, 4, 5, 6];

export default function BarcodeGenerator({ locale = "es" }: Props) {
  const isEs = locale === "es";

  const [symbology, setSymbology] = useState<Symbology>("ean13");
  const [eanInput, setEanInput] = useState("");
  const [codeInput, setCodeInput] = useState("MACM-TOOLS");
  const [moduleStep, setModuleStep] = useState(3);
  const [height, setHeight] = useState(120);
  const [showText, setShowText] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const eanDigits = useMemo(() => {
    const d = eanInput.replace(/\D/g, "");
    return d;
  }, [eanInput]);

  const eanResolved = useMemo(() => {
    if (eanDigits.length === 12) return { code: `${eanDigits}${ean13Checksum(eanDigits)}` };
    if (eanDigits.length === 13) return { code: eanDigits };
    return null;
  }, [eanDigits]);

  const code128Result = useMemo(() => code128Encode(codeInput), [codeInput]);

  const widths = symbology === "ean13" ? (eanResolved ? ean13Pattern(eanResolved.code) : "") : (code128Result?.widths ?? "");
  const modules = widths.length;
  const displayText = symbology === "ean13" ? (eanResolved?.code ?? "") : codeInput;
  const label = symbology === "ean13"
    ? (eanDigits.length === 12
        ? (isEs ? `Se añade el dígito de control ${eanResolved ? eanResolved.code[12] : ""}` : `Check digit ${eanResolved ? eanResolved.code[12] : ""} is appended`)
        : eanDigits.length === 13
          ? (isValidEan13(eanDigits) ? (isEs ? "EAN-13 válido" : "Valid EAN-13") : (isEs ? "Dígito de control incorrecto" : "Wrong check digit"))
          : (isEs ? "Introduce 12 o 13 dígitos" : "Enter 12 or 13 digits"))
    : (code128Result ? (isEs ? `Code128 (${code128Result.mode}) · check ${code128Result.checksumValue}` : `Code128 (${code128Result.mode}) · check ${code128Result.checksumValue}`) : (isEs ? "Solo caracteres ASCII imprimibles" : "Printable ASCII only"));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !widths) return;
    const px = moduleStep;
    const w = modules * px;
    const h = height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#000000";
    let pos = 0;
    let bar = true;
    for (const ch of widths) {
      const n = parseInt(ch, 10);
      if (bar) ctx.fillRect(pos, 0, n * px, h);
      pos += n * px;
      bar = !bar;
    }
  }, [widths, modules, moduleStep, height]);

  const downloadSvg = useCallback(() => {
    if (!svgRef.current || !widths) return;
    const svg = svgRef.current.outerHTML;
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>${svg}`], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = symbology === "ean13" ? `ean13-${displayText}.svg` : `code128-${displayText.replace(/[^ -~]/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [widths, symbology, displayText]);

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !widths) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = symbology === "ean13" ? `ean13-${displayText}.png` : `code128-${displayText.replace(/[^ -~]/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }, [widths, symbology, displayText]);

  const inputCls = "w-full rounded-lg border border-border/30 bg-surface/60 px-3 py-1.5 text-sm text-text";
  const labelCls = "block text-[11px] text-text-muted/60 mb-1";
  const btnToggle = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
      active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/30 bg-surface/60 text-text-muted hover:text-text"
    }`;

  const barRects: { x: number; w: number }[] = useMemo(() => {
    if (!widths) return [];
    const out: { x: number; w: number }[] = [];
    let pos = 0;
    let bar = true;
    for (const ch of widths) {
      const n = parseInt(ch, 10);
      if (bar) out.push({ x: pos, w: n });
      pos += n;
      bar = !bar;
    }
    return out;
  }, [widths]);

  const svgW = modules * moduleStep;
  const textH = showText ? 28 : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSymbology("ean13")} className={btnToggle(symbology === "ean13")}>EAN-13</button>
        <button onClick={() => setSymbology("code128")} className={btnToggle(symbology === "code128")}>Code 128</button>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/20 bg-surface/30 p-4">
        {symbology === "ean13" ? (
          <div>
            <span className={labelCls}>{isEs ? "Código EAN (12 dígitos: se calcula el dígito de control · 13 dígitos: se valida)" : "EAN code (12 digits: check digit is computed · 13 digits: validated)"}</span>
            <input
              value={eanInput}
              onChange={(e) => setEanInput(e.target.value.replace(/[^\d]/g, "").slice(0, 13))}
              className={inputCls}
              inputMode="numeric"
              dir="ltr"
              placeholder="4006381333931"
            />
          </div>
        ) : (
          <div>
            <span className={labelCls}>{isEs ? "Contenido (ASCII imprimible, hasta ~50 caracteres)" : "Content (printable ASCII, up to ~50 characters)"}</span>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className={inputCls}
              dir="ltr"
              maxLength={50}
              placeholder="MACM-2026-001"
            />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelCls}>{isEs ? "Grosor de módulo" : "Module width"}</label>
            <div className="flex gap-1">
              {MODULE_STEP_OPTIONS.map((m) => (
                <button key={m} onClick={() => setModuleStep(m)} className={btnToggle(moduleStep === m) + " px-2.5 py-1.5 text-xs"}>{m}×</button>
              ))}
            </div>
          </div>
          <div className="w-40">
            <label className={labelCls}>{isEs ? `Alto: ${height} px` : `Height: ${height} px`}</label>
            <input type="range" min={60} max={240} step={10} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <label className="flex items-center gap-2 pb-1 text-xs text-text-muted">
            <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} className="accent-primary" />
            {isEs ? "Mostrar el texto debajo" : "Show text below"}
          </label>
        </div>
        <p className="text-xs text-text-muted">{label}</p>
      </div>

      {widths ? (
        <div className="rounded-2xl border border-border/20 bg-surface/30 p-5">
          <div className="flex justify-center overflow-x-auto">
            <svg
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg"
              width={svgW}
              height={height + textH}
              viewBox={`0 0 ${svgW} ${height + textH}`}
              className="max-w-full"
              style={{ background: "#fff" }}
            >
              <rect x="0" y="0" width={svgW} height={height + textH} fill="#fff" />
              {barRects.map((r, i) => (
                <rect key={i} x={r.x * moduleStep} y={0} width={r.w * moduleStep} height={height} fill="#000" />
              ))}
              {showText && (
                <text
                  x={svgW / 2}
                  y={height + 22}
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontSize={symbology === "ean13" ? Math.max(12, moduleStep * 5) : Math.max(12, Math.min(20, svgW / (displayText.length + 2)))}
                  letterSpacing={symbology === "ean13" ? moduleStep * 1.5 : 0}
                  fill="#000"
                >
                  {displayText}
                </text>
              )}
            </svg>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="mt-3 text-center text-[11px] text-text-muted/60">
            {symbology === "ean13" ? `${EAN13_MODULES} módulos` : `${modules} módulos`} · {isEs ? "SVG vectorial y PNG a resolución exacta" : "SVG vector and exact-resolution PNG"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/30 bg-surface/30 p-10 text-center text-sm text-text-muted">
          {isEs
            ? "El código aparecerá aquí en cuanto el contenido sea válido."
            : "The barcode will appear here once the content is valid."}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadSvg}
          disabled={!widths}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
        >
          <FiDownload /> SVG
        </button>
        <button
          onClick={downloadPng}
          disabled={!widths}
          className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface/60 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          <FiImage /> PNG
        </button>
      </div>

      <details className="rounded-2xl border border-border/20 bg-surface/30 p-4 text-sm text-text-muted">
        <summary className="cursor-pointer font-semibold text-text">{isEs ? "Cómo funciona y limitaciones" : "How it works and limitations"}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>
            {isEs
              ? "Los patrones de barras se calculan con las tablas oficiales de la simbología (ISO/IEC 15417 para Code 128, GS1 para EAN-13): el resultado es imprimible y escaneable."
              : "Bar patterns are computed with the official symbology tables (ISO/IEC 15417 for Code 128, GS1 for EAN-13): the result is printable and scannable."}
          </li>
          <li>
            {isEs
              ? "Con 12 dígitos EAN, el dígito de control se calcula automáticamente; con 13 se valida el que hayas puesto."
              : "With 12 EAN digits the check digit is computed automatically; with 13, yours is validated."}
          </li>
          <li>
            {isEs
              ? "Code 128 usa el set C (dos dígitos por símbolo) para contenido numérico y el set B para el resto; incluye checksum mod 103 y patrón de parada completo."
              : "Code 128 uses set C (two digits per symbol) for numeric content and set B otherwise; it includes the mod-103 checksum and the full stop pattern."}
          </li>
          <li>
            {isEs
              ? "El SVG escala sin pérdida al tamaño que necesites; el PNG se genera a la resolución exacta elegida. Imprime con al menos 10 módulos de zona de silencio alrededor."
              : "SVG scales losslessly to any size; PNG is generated at the exact chosen resolution. Leave at least 10 modules of quiet zone around when printing."}
          </li>
        </ul>
      </details>
    </div>
  );
}
