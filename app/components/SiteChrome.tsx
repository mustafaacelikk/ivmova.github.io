"use client";
import { useState } from "react";
import Link from "next/link";
import { navCategories, news, showcaseTitle } from "../data";
import { institutionalLinks } from "../institutional";
import { sitePath } from "../paths";

export function Header() {
  const [open, setOpen] = useState(false);
  const breaking = news.find((item) => item.breaking);
  return <>
    <div className="bg-[#07172d] px-4 py-2 text-xs text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded bg-[#12b8a6] px-2 py-1 font-bold uppercase tracking-wider">Öne çıkanlar</span><a href={sitePath(breaking ? `/haber/${breaking.slug}` : "/")} className="truncate text-slate-200 hover:text-white">{breaking ? showcaseTitle(breaking) : ""}</a></div><span className="hidden text-slate-400 sm:block">Enerji · Enerji Piyasaları · Teknoloji</span></div></div>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4 sm:h-[88px]"><Link prefetch={false} href="/" aria-label="IVMOVA ana sayfa" className="block w-[180px] sm:w-[270px]"><img src={sitePath("/ivmova-wordmark.svg")} alt="IVMOVA" className="h-auto w-full" /><div className="mt-0.5 text-center text-[7px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">Dönüşümün Gündemi</div></Link><nav className="hidden items-center gap-5 text-sm font-semibold lg:flex" aria-label="Ana menü">{navCategories.map((category) => <a key={category.slug} href={sitePath(`/kategori/${category.slug}`)} className="transition hover:text-[#0d9688]">{category.name}</a>)}<Link prefetch={false} href="/yazarlar" className="transition hover:text-[#0d9688]">Yazarlar</Link></nav><button onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full bg-[#07172d] text-lg text-white lg:hidden" aria-label={open ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={open}>{open ? "×" : "☰"}</button></div>{open && <nav className="grid max-h-[calc(100vh-110px)] overflow-y-auto border-t border-slate-100 bg-white px-4 py-2 lg:hidden">{navCategories.map((category) => <a key={category.slug} href={sitePath(`/kategori/${category.slug}`)} className="border-b border-slate-100 py-3 font-semibold">{category.name}</a>)}<Link prefetch={false} href="/yazarlar" className="py-3 font-semibold">Yazarlar</Link></nav>}</header>
  </>;
}

export function Footer() {
  return <footer className="bg-[#07172d] text-white"><div className="mx-auto max-w-7xl px-4 py-10"><div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]"><div><img src={sitePath("/ivmova-wordmark.svg")} alt="IVMOVA" className="w-44 brightness-0 invert" /><p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Enerji, enerji piyasaları, teknoloji, mobilite ve iklim alanlarında haberler, analizler ve uzman görüşleri.</p></div><nav className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3" aria-label="Kurumsal bağlantılar">{institutionalLinks.map(([label, href]) => <Link prefetch={false} key={href} href={`/kurumsal/${href}`} className="text-slate-300 transition hover:text-[#59d8ca]">{label}</Link>)}</nav></div><div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:justify-between"><p>Bu sürüm yayın yapısını göstermek amacıyla demo içerik kullanır.</p><p>© 2026 IVMOVA</p></div></div></footer>;
}
