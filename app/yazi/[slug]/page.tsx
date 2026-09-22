import { Footer, Header } from "../../components/SiteChrome";
import { columnBySlug, writerBySlug } from "../../writers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { columns } from "../../writers";

export const dynamicParams = false;

export function generateStaticParams() {
  return columns.map((column) => ({ slug: column.slug }));
}

export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const column = columnBySlug(slug); const writer = column ? writerBySlug(column.writerSlug) : undefined;
  if (!column || !writer) notFound();
  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]"><Header /><nav className="bg-[#07172d] text-white"><div className="mx-auto flex max-w-4xl gap-2 px-4 py-3 text-xs font-bold"><Link prefetch={false} href="/yazarlar" className="text-slate-300">Yazarlar</Link><span className="text-slate-600">/</span><Link prefetch={false} href={`/yazarlar/${writer.slug}`} className="text-[#59d8ca]">{writer.name}</Link></div></nav><article className="mx-auto max-w-4xl px-4 py-10 sm:py-14"><p className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">Bu yazı yerel önizleme için hazırlanmış demo içeriktir; gerçek yazar yazısı veya yayın onayı sayılmaz.</p><span className="rounded bg-[#12b8a6] px-2 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white">Görüş</span><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">{column.title}</h1><p className="mt-5 text-xl leading-8 text-slate-600">{column.summary}</p><Link prefetch={false} href={`/yazarlar/${writer.slug}`} className="mt-7 flex items-center gap-3 border-y border-slate-200 py-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#07172d] text-sm font-black text-[#59d8ca]">{writer.initials}</span><span><strong className="block">{writer.name}</strong><span className="text-sm text-slate-500">{column.published}</span></span></Link><div className="mx-auto max-w-3xl py-10">{column.body.map((paragraph, index) => <p key={index} className={`${index === 0 ? "text-xl font-semibold leading-9" : "text-lg leading-8 text-slate-700"} mb-7`}>{paragraph}</p>)}<aside className="mt-10 border-l-4 border-[#12b8a6] bg-white p-5 text-sm leading-6 text-slate-500">Bu yazı yazarın kişisel değerlendirmesidir; IVMOVA’nın kurumsal görüşünü temsil etmek zorunda değildir.</aside></div></article><Footer /></main>;
}
