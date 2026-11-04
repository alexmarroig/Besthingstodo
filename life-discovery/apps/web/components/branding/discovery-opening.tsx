"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { usePathname } from "next/navigation";
import BrandMark from "../branding/brand-mark";

const SEEN_KEY = "bestthingstodo:opening:v1";

export default function DiscoveryOpening() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const initialFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private browsing */ }
  }, []);

  useEffect(() => {
    if (pathname !== "/" && pathname !== "/home") return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
    } catch { /* still allow a single opening */ }
    // A short first-visit experience, never an artificial loading gate.
    setVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    initialFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    actionRef.current?.focus({ preventScroll: true });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(close, reducedMotion ? 1000 : 3800);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") { event.preventDefault(); actionRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      initialFocusRef.current?.focus({ preventScroll: true });
    };
  }, [visible, close]);

  const moveLight = (event: PointerEvent<HTMLDivElement>) => {
    // Manipulate only CSS properties: no React re-renders or canvas workload per frame.
    const element = stageRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    element.style.setProperty("--light-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    element.style.setProperty("--light-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  };

  if (!visible) return null;

  return (
    <div
      ref={stageRef}
      onPointerMove={moveLight}
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao BestThingsToDo"
      className="discovery-opening fixed inset-0 z-[110] isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#080e16] px-5 py-12 text-center text-[#f6f0e6]"
    >
      <div className="discovery-opening__light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="discovery-opening__grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <svg className="discovery-opening__map pointer-events-none absolute left-1/2 top-1/2 h-[min(92vw,700px)] w-[min(92vw,700px)] -translate-x-1/2 -translate-y-1/2 opacity-75" viewBox="0 0 700 700" fill="none" aria-hidden="true">
        <circle cx="350" cy="350" r="265" stroke="#E5C68E" strokeOpacity=".15" strokeWidth="1" />
        <circle cx="350" cy="350" r="191" stroke="#E5C68E" strokeOpacity=".12" strokeWidth="1" strokeDasharray="2 11" />
        <circle cx="350" cy="350" r="116" stroke="#E5C68E" strokeOpacity=".16" strokeWidth=".7" />
        <path className="discovery-opening__route" d="M102 375 C196 311 210 440 300 359 S440 202 511 294 S555 458 612 350" stroke="#EBD6AA" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 9" />
        <path d="M164 218 L298 359 L489 192 M298 359 L515 482" stroke="#EBD6AA" strokeOpacity=".12" strokeWidth=".9" />
        {([[102,375],[164,218],[298,359],[489,192],[511,294],[515,482],[612,350]] as [number,number][]).map(([x,y],i) => (
          <g key={i} className="discovery-opening__point" style={{ animationDelay: `${i * 130}ms` }}>
            <circle cx={x} cy={y} r="8" fill="#EBD6AA" fillOpacity=".07" />
            <circle cx={x} cy={y} r={i === 2 ? 4 : 2.5} fill="#F5DEAF" />
          </g>
        ))}
      </svg>

      <div className="discovery-opening__content relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="discovery-opening__symbol mb-9 rounded-[22px] border border-[#dfbf82]/25 bg-[#111c27]/80 p-3 shadow-[0_0_80px_rgba(231,201,148,.14)] sm:mb-12">
          <BrandMark size="lg" />
        </div>
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.38em] text-[#e4c794] sm:text-xs">BESTTHINGSTODO</p>
        <h2 className="max-w-[550px] font-serif text-[clamp(2.7rem,8vw,5.4rem)] font-normal leading-[1.02] tracking-[-.055em]">
          O mundo ainda tem <em className="font-normal text-[#e7c994]">muito</em> para você.
        </h2>
        <p className="mt-6 max-w-sm text-[14px] leading-7 text-[#d6d1ca]/75 sm:text-base">
          Lugares, histórias e encontros que merecem ser descobertos.
        </p>
        <button
          ref={actionRef}
          type="button"
          onClick={close}
          className="discovery-opening__action mt-10 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#e7c994]/50 bg-[#e7c994] px-7 py-3 text-[13px] font-semibold text-[#111923] outline-none transition-colors hover:bg-[#f7dfae] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#080e16]"
        >
          Começar a descobrir <span aria-hidden="true">↗</span>
        </button>
        <p className="mt-5 text-[11px] tracking-wide text-white/35">Toque ou mova o cursor para explorar a luz</p>
      </div>
      <span className="pointer-events-none absolute bottom-8 left-0 right-0 text-[10px] uppercase tracking-[0.3em] text-white/30" aria-hidden="true">Seu próximo capítulo começa aqui</span>
    </div>
  );
}
