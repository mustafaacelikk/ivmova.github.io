"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sitePath } from "../paths";

export function SubcategoryNav({ category, categoryName, items, active }: { category: string; categoryName: string; items: string[]; active: string | null }) {
  const scroller = useRef<HTMLElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  const base = "shrink-0 rounded-full border px-3 py-1.5 transition";
  const passive = "border-white/15 text-slate-300 hover:border-white/40 hover:text-white";
  const selected = "border-[#12b8a6] bg-[#12b8a6] text-[#07172d]";

  return <div className="relative">
    <nav ref={scroller} onScroll={updateScrollState} className="flex touch-pan-x snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-12 text-xs font-bold whitespace-nowrap [scrollbar-width:thin] [scrollbar-color:#475569_transparent] md:pr-0" aria-label={`${categoryName} alt kategorileri`}>
      <a href={sitePath(`/kategori/${category}`)} className={`${base} snap-start ${!active ? selected : passive}`}>Tümü</a>
      {items.map((item) => <a key={item} href={sitePath(`/kategori/${category}?alt=${encodeURIComponent(item)}`)} className={`${base} snap-start ${active === item ? selected : passive}`}>{item} →</a>)}
    </nav>
    {canScrollRight && <><div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#07172d] via-[#07172d]/90 to-transparent md:hidden" /><button type="button" onClick={() => scroller.current?.scrollBy({ left: Math.max(180, scroller.current.clientWidth * .65), behavior: "smooth" })} className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#102440] text-lg text-white shadow-lg md:hidden" aria-label="Diğer alt kategorileri göster">›</button></>}
  </div>;
}
