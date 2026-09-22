import { Footer, Header } from "../../components/SiteChrome";
import { categoryMeta } from "../../data";
import { getAllPublishedNews, getPublishedArticle, getPublishedArticleEvent, getPublishedArticleSource } from "../../published-news";
import Link from "next/link";
import { ArticleBody } from "../../components/ArticleBody";
import { LocalDateTime } from "../../components/LocalDateTime";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export async function generateStaticParams() {
  const items = await getAllPublishedNews();
  return items.map((item) => ({ slug: item.slug }));
}

function ShareLinks({ title, slug }: { title: string; slug: string }) {
  const url = encodeURIComponent(`https://ivmova.com/haber/${slug}`);
  const text = encodeURIComponent(title);
  const button = "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold transition hover:border-[#12b8a6] hover:text-[#0d9688]";
  return <div className="flex flex-wrap items-center gap-2" aria-label="Haberi paylaş">
    <span className="mr-1 text-xs font-black uppercase tracking-[.16em] text-slate-400">Paylaş</span>
    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} target="_blank" rel="noreferrer" className={button}>LinkedIn</a>
    <a href={`https://x.com/intent/post?text=${text}&url=${url}`} target="_blank" rel="noreferrer" className={button}>X</a>
    <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noreferrer" className={button}>Facebook</a>
    <a href={`mailto:?subject=${text}&body=${url}`} className={button}>E-posta</a>
  </div>;
}

function publishedValue(value: string) {
  const months: Record<string, number> = { Ocak: 0, Şubat: 1, Mart: 2, Nisan: 3, Mayıs: 4, Haziran: 5, Temmuz: 6, Ağustos: 7, Eylül: 8, Ekim: 9, Kasım: 10, Aralık: 11 };
  const match = value.match(/(\d+)\s+(\S+)\s+(\d+),\s+(\d+):(\d+)/);
  return match ? new Date(Number(match[3]), months[match[2]] ?? 0, Number(match[1]), Number(match[4]), Number(match[5])).getTime() : 0;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedArticle(slug);
  if (!item) notFound();

  const allItems = await getAllPublishedNews();
  const eventDossier = await getPublishedArticleEvent(slug);
  const articleSource = await getPublishedArticleSource(slug);
  const categoryNews = allItems.filter((entry) => entry.category === item.category && entry.id !== item.id).sort((a, b) => publishedValue(b.published) - publishedValue(a.published)).slice(0, 5);
  const meta = categoryMeta[item.category];
  const showInvestmentNotice = item.category === "piyasalar" || /(yatırımcı|hisse|tahvil|portföy|getiri|sermaye piyasası|alım.?satım)/i.test(`${item.title} ${item.summary} ${item.body.join(" ")}`);

  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]">
    <Header />
    <article>
      <header className="bg-white">
        <nav className="bg-[#07172d] text-white" aria-label="İçerik yolu"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 text-xs font-bold"><Link prefetch={false} href="/" className="text-slate-300 hover:text-white">Ana Sayfa</Link><span className="text-slate-600">/</span><Link prefetch={false} href={`/kategori/${item.category}`} className="text-[#59d8ca] hover:text-white">{meta.name}</Link><span className="text-slate-600">/</span><Link prefetch={false} href={`/kategori/${item.category}?alt=${encodeURIComponent(item.subcategory)}`} className="text-[#59d8ca] hover:text-white">{item.subcategory}</Link></div></nav>
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-8 sm:pt-10">
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">Bu kayıt yerel önizleme için hazırlanmış demo haber içeriğidir; gerçek yayın onayı veya güncel haber niteliği taşımaz.</p>
          {item.breaking && <span className="rounded bg-[#12b8a6] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">Son dakika</span>}
          <h1 className={`${item.breaking ? "mt-4" : ""} max-w-4xl [overflow-wrap:anywhere] text-[34px] font-black leading-[1.06] tracking-[-.04em] sm:text-5xl`}>{item.title}</h1>
          <p className="mt-5 max-w-4xl [overflow-wrap:anywhere] text-xl leading-8 text-slate-600 sm:text-2xl sm:leading-9">{item.summary}</p>
          <div className="mt-5 flex flex-col gap-4 border-y border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="space-y-1 text-sm text-slate-500"><div><span className="font-semibold">Yayımlandı:</span> {item.publishedIso ? <LocalDateTime value={item.publishedIso} fallback={item.published} /> : <time>{item.published}</time>}</div>{item.updatedIso ? <div><span className="font-semibold">Güncellendi:</span> <LocalDateTime value={item.updatedIso} fallback={item.updated} /></div> : null}</div><ShareLinks title={item.title} slug={item.slug} /></div>
          {eventDossier && <aside className="mt-4 rounded-xl border border-[#0d9688]/30 bg-[#12b8a6]/5 px-4 py-3 text-sm"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#087f73]">Konu dosyası</span><strong className="text-[10px] font-bold uppercase tracking-[.12em] text-[#07172d]">{eventDossier.title}</strong></div><p className="mt-2 text-xs leading-5 text-slate-600">Bu haber, <strong className="font-semibold text-slate-700">{eventDossier.title}</strong> konusuyla ilgili takip edilen gelişmelerden biridir.</p><Link prefetch={false} href={`/olay-dosyasi/${eventDossier.id}`} className="mt-2 inline-block text-xs font-black text-[#087f73] hover:text-[#07172d]">Bu konudaki tüm haberleri gör →</Link></aside>}
        </div>
      </header>

      <figure className="mx-auto max-w-5xl px-4 pt-5 sm:pt-7"><div className="aspect-[16/7] overflow-hidden rounded-xl bg-[#07172d] sm:aspect-[16/6]"><img src={item.image} alt={item.imageAlt ?? item.title} className="h-full w-full object-cover" /></div><figcaption className="mt-2 text-xs leading-5 text-slate-500">{item.imageCaption ?? item.title} · Görsel: {item.imageSource ?? "IVMOVA demo görsel arşivi"}{item.imageMethod === "ai_generated" ? ` · AI ile üretilmiştir${item.imageAiTool ? ` (${item.imageAiTool})` : ""}` : ""}</figcaption></figure>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_250px] lg:py-12">
        <div className="max-w-3xl"><ArticleBody body={item.body} />{showInvestmentNotice && <aside className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Yatırım bilgilendirmesi:</strong> Bu içerik yalnızca genel bilgilendirme amacı taşır; yatırım danışmanlığı kapsamında değildir ve herhangi bir sermaye piyasası aracı için alım-satım önerisi içermez.</aside>}<section className="mt-10 border-y border-slate-200 py-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Kaynak ve şeffaflık</p>{articleSource ? <div className="mt-3"><a href={articleSource.articleUrl} target="_blank" rel="noopener noreferrer" className="font-black text-[#0d9688] underline decoration-slate-300 underline-offset-4">{articleSource.name} — özgün haberi aç ↗</a><p className="mt-2 break-all text-xs text-slate-400">{articleSource.articleUrl}</p></div> : <p className="mt-2 font-black">{item.source === "IVMOVA" ? "IVMOVA özgün içeriği" : item.source}</p>}<p className="mt-3 text-sm leading-6 text-slate-500">Kaynak ve güncelleme bilgileri açık gösterilir; gerekli düzeltmeler içerik üzerinde belirtilir.</p></section><div className="mt-6 flex justify-end"><ShareLinks title={item.title} slug={item.slug} /></div></div>
        {categoryNews.length > 0 && <aside className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div className="lg:sticky lg:top-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0d9688]">Bu kategorideki diğer haberler</p><div className="mt-3 divide-y divide-slate-200">{categoryNews.map((entry) => <Link prefetch={false} key={entry.id} href={`/haber/${entry.slug}`} className="group block py-4 first:pt-2"><time className="text-[10px] text-slate-400">{entry.published}</time><h2 className="mt-1 text-sm font-black leading-5 group-hover:text-[#0d9688]">{entry.title}</h2></Link>)}</div><Link prefetch={false} href={`/kategori/${item.category}`} className="mt-3 inline-block text-xs font-black text-[#0d9688]">Tüm {meta.name.toLocaleLowerCase("tr-TR")} haberleri →</Link></div></aside>}
      </div>
    </article>
    <div className="h-20 border-t border-slate-200 bg-white" aria-hidden="true" />
    <Footer />
  </main>;
}
