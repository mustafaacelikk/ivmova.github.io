import Link from "next/link";
import { Footer, Header } from "./components/SiteChrome";
import { categoryMeta, showcaseSummary, showcaseTitle, type NewsItem } from "./data";
import type { PublicEventDossier } from "./published-news";

const statusLabel: Record<string, string> = { monitoring: "Takip ediliyor", open: "Aktif gelişme", closed: "Dosya kapandı" };

function dateLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

export function EventDossierTemplate({ dossier, articles }: { dossier: PublicEventDossier; articles: NewsItem[] }) {
  const dates = [dateLabel(dossier.startedAt), dateLabel(dossier.endedAt)].filter(Boolean);

  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]">
    <Header />
    <section className="bg-[#07172d] text-white"><div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-black uppercase tracking-[.2em] text-[#59d8ca]">Gelişme dosyası</p><span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider">{statusLabel[dossier.status] ?? "Takip ediliyor"}</span></div>
      <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-.035em] sm:text-5xl">{dossier.title}</h1>
      {dossier.summary && <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">{dossier.summary}</p>}
      {(dossier.location || dates.length > 0) && <p className="mt-5 text-sm text-slate-400">{[dossier.location, dates.join(" - ")].filter(Boolean).join(" · ")}</p>}
    </div></section>
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#0d9688]">Kronoloji</p><h2 className="mt-2 text-3xl font-black">Bu gelişmenin haberleri</h2></div><span className="text-sm font-bold text-slate-400">{articles.length} haber</span></div>
      {articles.length === 0 ? <div className="py-16 text-center text-slate-500">Bu dosyada henüz yayımlanmış haber bulunmuyor.</div> : <div className="divide-y divide-slate-200">{articles.map((article) => <Link prefetch={false} key={article.id} href={`/haber/${article.slug}`} className="group grid gap-4 py-6 sm:grid-cols-[145px_1fr_190px] sm:items-center">
        <time className="text-sm text-slate-500">{article.published}</time>
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0d9688]">{categoryMeta[article.category].name} · {article.subcategory}</p><h3 className="mt-2 [overflow-wrap:anywhere] text-xl font-black leading-7 group-hover:text-[#0d9688]">{showcaseTitle(article)}</h3><p className="mt-2 line-clamp-2 [overflow-wrap:anywhere] text-sm leading-6 text-slate-500">{showcaseSummary(article)}</p></div>
        <div className="aspect-[16/9] overflow-hidden rounded-xl bg-slate-200"><img src={article.image} alt={article.imageAlt ?? article.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /></div>
      </Link>)}</div>}
    </section>
    <Footer />
  </main>;
}
