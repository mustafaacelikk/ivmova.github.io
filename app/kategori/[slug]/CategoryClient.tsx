"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SubcategoryNav } from "../../components/SubcategoryNav";
import { categoryMeta, showcaseTitle, subcategoryMeta, type CategorySlug, type NewsItem } from "../../data";
import { sitePath } from "../../paths";

export function CategoryClient({ category, publishedNews }: { category: CategorySlug; publishedNews: NewsItem[] }) {
  const searchParams = useSearchParams();
  const meta = categoryMeta[category];
  const allItems = publishedNews.filter(item => item.category === category).sort((a, b) => publishedValue(b.published) - publishedValue(a.published));
  const alt = searchParams.get("alt");
  const activeSubcategory = alt && subcategoryMeta[category].includes(alt) ? alt : null;
  const items = activeSubcategory ? allItems.filter(item => item.subcategory === activeSubcategory) : allItems;
  const related = [...publishedNews].sort((a, b) => Number(Boolean(b.breaking)) - Number(Boolean(a.breaking)) || b.priority - a.priority).filter(item => item.category !== category).slice(0, 3);

  return <>
    <section className="bg-[#07172d] text-white"><div className="mx-auto max-w-7xl px-4 py-6 sm:py-7"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#59d8ca]">{meta.kicker}</p><div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1"><h1 className="text-3xl font-black tracking-[-.035em] sm:text-4xl">{meta.name}</h1><p className="max-w-2xl text-sm text-slate-300">{meta.description}</p></div></div><div className="mt-4 border-t border-white/10 pt-3"><p className="mb-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Alt kategoriler</p><SubcategoryNav category={category} categoryName={meta.name} items={subcategoryMeta[category]} active={activeSubcategory}/></div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-8"><div className="mb-5 flex items-end justify-between border-b border-slate-200 pb-3"><h2 className="text-2xl font-black">{activeSubcategory??meta.name}</h2>{activeSubcategory&&<a href={sitePath(`/kategori/${category}`)} className="text-xs font-bold text-[#0d9688]">Tüm {meta.name.toLocaleLowerCase("tr-TR")} haberleri →</a>}</div>{items.length?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(item=><StoryTile key={item.id} item={item}/>)}</div>:<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="font-bold">Bu alt kategoride henüz içerik bulunmuyor.</p><a href={sitePath(`/kategori/${category}`)} className="mt-3 inline-block text-sm font-bold text-[#0d9688]">Tüm {meta.name.toLocaleLowerCase("tr-TR")} haberlerini göster →</a></div>}{category==="piyasalar"&&<InvestmentNotice/>}</section>

    <section className="mx-auto max-w-7xl px-4 py-10"><div className="mb-5 flex items-end justify-between border-b border-slate-200 pb-3"><h2 className="text-2xl font-black">Dönüşümden diğer başlıklar</h2><Link prefetch={false} href="/" className="text-sm font-bold">Ana sayfa →</Link></div><div className="grid gap-4 md:grid-cols-3">{related.map(item=><a key={item.id} href={sitePath(`/haber/${item.slug}`)} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#12b8a6]"><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#0d9688]">{categoryMeta[item.category].name}</span><h3 className="mt-2 [overflow-wrap:anywhere] text-lg font-black leading-snug group-hover:text-[#0d9688]">{showcaseTitle(item)}</h3></a>)}</div></section>
  </>;
}

function StoryTile({item}:{item:NewsItem}){return <a href={sitePath(`/haber/${item.slug}`)} className="group relative block min-h-[220px] overflow-hidden rounded-xl bg-[#07172d] text-white sm:min-h-[245px]"><img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-[#061326] via-[#061326]/35 to-transparent"/><div className="absolute inset-x-0 bottom-0 min-w-0 p-4"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#59d8ca]">{item.subcategory} · {item.time}</span><h3 className="mt-2 [overflow-wrap:anywhere] text-lg font-black leading-tight">{showcaseTitle(item)}</h3></div></a>}

function InvestmentNotice(){return <aside className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Bilgilendirme:</strong> Bu bölümdeki içerikler genel bilgilendirme amacı taşır; yatırım danışmanlığı kapsamında değildir ve herhangi bir sermaye piyasası aracı için alım-satım önerisi içermez.</aside>}

function publishedValue(value:string){const months:Record<string,number>={Ocak:0,Şubat:1,Mart:2,Nisan:3,Mayıs:4,Haziran:5,Temmuz:6,Ağustos:7,Eylül:8,Ekim:9,Kasım:10,Aralık:11};const match=value.match(/(\d{1,2})\s+(\S+)\s+(\d{4}),\s*(\d{2}):(\d{2})/);if(!match)return 0;return Date.UTC(Number(match[3]),months[match[2]]??0,Number(match[1]),Number(match[4]),Number(match[5]));}
