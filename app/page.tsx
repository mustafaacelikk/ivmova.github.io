"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Footer, Header } from "./components/SiteChrome";
import { categoryMeta, news, showcaseSummary, showcaseTitle, type CategorySlug, type NewsItem } from "./data";
import { sitePath } from "./paths";

const sortItems = (items: NewsItem[]) => [...items].sort((a,b) => Number(Boolean(b.breaking))-Number(Boolean(a.breaking)) || b.priority-a.priority);

function NewsCard({ item, large = false }: { item: (typeof news)[number]; large?: boolean }) {
  return (
    <a href={sitePath(`/haber/${item.slug}`)} className={`group relative block overflow-hidden rounded-2xl bg-[#07172d] ${large ? "min-h-[340px]" : "min-h-[250px]"}`}>
      <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#061326] via-[#061326]/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#59d8ca]">{categoryMeta[item.category].name} · {item.subcategory} · <span className="text-slate-300">{item.time}</span></div>
        <h3 className={`${large ? "text-2xl sm:text-3xl" : "text-xl"} font-black leading-tight tracking-tight`}>{showcaseTitle(item)}</h3>
        <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-5 text-slate-300">{showcaseSummary(item)}</p>
      </div>
    </a>
  );
}

function CompactStory({ item, index }: { item: (typeof news)[number]; index: number }) {
  return <a href={sitePath(`/haber/${item.slug}`)} className="group grid grid-cols-[34px_1fr] gap-3 border-t border-slate-200 py-4 first:border-t-0 sm:border-t-0 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0">
    <span className="text-sm font-black text-[#12b8a6]">{String(index + 1).padStart(2, "0")}</span>
    <span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{categoryMeta[item.category].name} · {item.time}</span><strong className="mt-1.5 block leading-snug transition group-hover:text-[#0d9688]">{showcaseTitle(item)}</strong></span>
  </a>;
}

export default function Home() {
  const [items] = useState<NewsItem[]>(news);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const headlines = useMemo(() => sortItems(items).slice(0, 5), [items]);

  const previous = useCallback(() => setSlide((current) => (current - 1 + headlines.length) % headlines.length), [headlines.length]);
  const next = useCallback(() => setSlide((current) => (current + 1) % headlines.length), [headlines.length]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(next, 7000);
    return () => window.clearInterval(timer);
  }, [paused, next]);

  const current = headlines[slide];
  const currentHeroTitle = current.heroTitle?.trim() || current.title;
  const currentHeroSummary = current.heroSummary?.trim() || current.summary;
  const marketItems = [
    ...items.filter((item) => item.category === "piyasalar"),
    ...items.filter((item) => item.category === "analiz" && ["Şirketler ve İş Dünyası", "Şirket ve Yatırım"].includes(item.subcategory)),
  ];
  const analysisItems = items.filter((item) => item.category === "analiz" && !["Şirketler ve İş Dünyası", "Şirket ve Yatırım"].includes(item.subcategory));

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-6" aria-label="Manşet haberleri">
        <div
          className="group relative min-h-[390px] overflow-hidden rounded-xl bg-[#07172d] shadow-xl shadow-slate-300/40 sm:min-h-[500px] sm:rounded-2xl sm:shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={(event) => { if (event.key === "ArrowLeft") previous(); if (event.key === "ArrowRight") next(); }}
          onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
          onTouchEnd={(event) => {
            if (touchStart === null) return;
            const distance = event.changedTouches[0].clientX - touchStart;
            if (Math.abs(distance) > 45) {
              if (distance > 0) previous(); else next();
            }
            setTouchStart(null);
          }}
        >
          {headlines.map((item, index) => (
            <img key={item.id} src={item.image} alt="" className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${index === slide ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#061326] via-[#061326]/55 to-transparent" />
          <a href={sitePath(`/haber/${current.slug}`)} className="absolute inset-0 z-10" aria-label={`${current.title} haberini aç`} />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 pb-16 text-white sm:px-24 sm:pb-16 lg:px-28 lg:pb-14">
            <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
              {current.breaking && <span className="rounded bg-[#12b8a6] px-3 py-1.5">Son dakika</span>}
              <span>{categoryMeta[current.category].name}</span><span className="text-slate-300">· {current.time}</span>
            </div>
            <h1 className={`max-w-4xl [overflow-wrap:anywhere] text-[28px] font-black leading-[1.08] tracking-[-.035em] ${currentHeroTitle.length > 72 ? "sm:text-4xl" : "sm:text-5xl"}`}>{currentHeroTitle}</h1>
            <p className="mt-3 max-w-3xl [overflow-wrap:anywhere] text-sm leading-6 text-slate-200 sm:mt-4 sm:text-lg">{currentHeroSummary}</p>
          </div>

          <button onClick={previous} className="absolute left-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-[#07172d]/80 text-2xl text-white opacity-100 shadow-lg transition hover:bg-[#12b8a6] sm:left-6 sm:h-12 sm:w-12 sm:text-3xl sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label="Önceki manşet">‹</button>
          <button onClick={next} className="absolute right-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-[#07172d]/80 text-2xl text-white opacity-100 shadow-lg transition hover:bg-[#12b8a6] sm:right-6 sm:h-12 sm:w-12 sm:text-3xl sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label="Sonraki manşet">›</button>
          <div className="absolute bottom-5 right-5 z-30 flex gap-2 sm:bottom-9 sm:right-9">
            {headlines.map((item, index) => <button key={item.id} onClick={() => setSlide(index)} className={`h-2 rounded-full shadow transition-all ${index === slide ? "w-9 bg-[#12b8a6]" : "w-5 bg-white/60 hover:bg-white"}`} aria-label={`${index + 1}. manşete git`} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-1" aria-labelledby="gunun-akisi"><div className="rounded-2xl border border-slate-200 bg-white px-5 shadow-sm sm:px-6"><div className="border-b border-slate-200 py-4"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#0d9688]">Hızlı bakış</p><h2 id="gunun-akisi" className="mt-1 text-xl font-black">Günün Akışı</h2></div><div className="grid sm:grid-cols-2 lg:grid-cols-4">{sortItems(items).slice(1, 5).map((item, index) => <CompactStory key={item.id} item={item} index={index}/>)}</div></div></section>

      <section className="bg-white py-11"><div className="mx-auto max-w-7xl px-4"><SectionHeading kicker="Sistemin yeni yönü" title="Enerjide Bugün" href="/kategori/enerji"/><div className="grid gap-5 lg:grid-cols-[1.45fr_.85fr]">{items.filter(item=>item.category==="enerji").slice(0,2).map((item,index)=><NewsCard key={item.id} item={item} large={index===0}/>)}</div></div></section>

      <section className="py-11"><div className="mx-auto max-w-7xl px-4"><SectionHeading kicker="Teknolojiden sahaya" title="Dönüşüm Gündemi"/><div className="grid gap-5 md:grid-cols-3">{(["teknoloji","mobilite","iklim"] as CategorySlug[]).map(slug=>{const item=items.find(n=>n.category===slug); if(!item)return null; return <div key={slug}><div className="mb-3 flex items-center justify-between"><a href={sitePath(`/kategori/${slug}`)} className="text-xs font-black uppercase tracking-[.18em] text-[#0d9688] transition hover:text-[#07172d]">{categoryMeta[slug].name}</a><a href={sitePath(`/kategori/${slug}`)} className="text-xs font-bold text-slate-500 transition hover:text-[#0d9688]">Tümü →</a></div><NewsCard item={item}/></div>})}</div></div></section>

      <section className="bg-[#f4f6f8] py-12"><div className="mx-auto max-w-7xl px-4"><div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-4"><div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#0d9688]">Fiyatlar · Şirketler · Veriler</p><h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-4xl">Enerji Piyasaları ve İş Dünyası</h2></div><a href={sitePath("/kategori/piyasalar")} className="shrink-0 text-xs font-bold text-slate-600 transition hover:text-[#0d9688] sm:text-sm">Tümünü gör →</a></div>{marketItems.length > 0 && <div className={`grid gap-5 ${marketItems.length > 1 ? "lg:grid-cols-[1.45fr_.85fr]" : ""}`}><NewsCard item={marketItems[0]} large />{marketItems.length > 1 && <div className="grid gap-5">{marketItems.slice(1, 3).map((item) => <NewsCard key={item.id} item={item} />)}</div>}</div>}</div></section>

      <section className="bg-white py-12"><div className="mx-auto max-w-7xl px-4"><SectionHeading kicker="Gelişmenin ötesi" title="Analiz ve Dosyalar" href="/kategori/analiz"/>{analysisItems.length > 0 && <><a href={sitePath(`/haber/${analysisItems[0].slug}`)} className="group grid overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f7f7] lg:grid-cols-[1.05fr_1fr]"><img src={analysisItems[0].image} alt="" className="h-72 w-full object-cover lg:h-full"/><div className="flex flex-col justify-center p-7 sm:p-10"><span className="text-xs font-black uppercase tracking-[.2em] text-[#0d9688]">{analysisItems[0].subcategory}</span><h3 className="mt-4 [overflow-wrap:anywhere] text-3xl font-black leading-tight tracking-tight sm:text-4xl">{showcaseTitle(analysisItems[0])}</h3><p className="mt-4 line-clamp-3 max-w-xl [overflow-wrap:anywhere] leading-7 text-slate-600">{showcaseSummary(analysisItems[0])}</p><span className="mt-6 text-sm font-bold">Analizi oku →</span></div></a>{analysisItems.length > 1 && <div className="mt-5 grid gap-5 md:grid-cols-3">{analysisItems.slice(1, 4).map((item) => <NewsCard key={item.id} item={item} />)}</div>}</>}</div></section>

      <section className="mx-auto max-w-7xl px-4 py-14"><div className="rounded-2xl bg-[#07172d] p-7 text-white shadow-[0_18px_45px_rgba(7,23,45,.14)] sm:p-10"><div className="grid gap-8 lg:grid-cols-[1fr_2fr]"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#59d8ca]">Canlı yayın akışı</p><h2 className="mt-3 text-3xl font-black">Son gelişmeler</h2><p className="mt-3 text-sm leading-6 text-slate-400">Enerji, enerji piyasaları, teknoloji, mobilite ve iklimden öne çıkan gelişmeler; en yeniden eskiye.</p></div><div className="divide-y divide-white/10">{sortItems(items).slice(0, 6).map((item) => <a key={item.id} href={sitePath(`/haber/${item.slug}`)} className="grid gap-2 py-4 transition hover:text-[#59d8ca] sm:grid-cols-[90px_110px_1fr]"><span className="text-sm text-slate-400">{item.time}</span><span className="text-xs font-bold uppercase tracking-wider text-[#59d8ca]">{categoryMeta[item.category].name}</span><strong className="[overflow-wrap:anywhere]">{showcaseTitle(item)}</strong></a>)}</div></div></div></section>
      <Footer />
    </main>
  );
}

function SectionHeading({kicker,title,href}:{kicker:string;title:string;href?:string}){return <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#0d9688] sm:text-[11px] sm:tracking-[.22em]">{kicker}</p><h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-4xl">{title}</h2></div>{href&&<a href={sitePath(href)} className="shrink-0 text-xs font-bold sm:text-sm">Tümünü gör →</a>}</div>}
