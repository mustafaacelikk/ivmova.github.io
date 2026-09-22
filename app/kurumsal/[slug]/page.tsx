import { Footer, Header } from "../../components/SiteChrome";
import { institutionalLinks, institutionalPages } from "../../institutional";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(institutionalPages).map((slug) => ({ slug }));
}

export default async function InstitutionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const page = institutionalPages[slug];
  if (!page) notFound();
  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]"><Header /><div className="bg-[#07172d] text-white"><div className="mx-auto max-w-5xl px-4 py-9"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#59d8ca]">{page.kicker}</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{page.title}</h1><p className="mt-4 max-w-3xl leading-7 text-slate-300">{page.intro}</p>{page.updated && <p className="mt-4 text-xs text-slate-500">Son güncelleme: {page.updated}</p>}</div></div><div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_230px]"><article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-9">{page.sections.map((section) => <section key={section.title} className="border-b border-slate-100 py-6 first:pt-0 last:border-0 last:pb-0"><h2 className="text-2xl font-black">{section.title}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 leading-7 text-slate-600">{paragraph}</p>)}{section.items && <ul className="mt-3 space-y-2 text-slate-600">{section.items.map((item) => <li key={item} className="flex gap-3 leading-7"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#12b8a6]" /><span>{section.emphasizeInitials ? <><strong className="font-black text-[#0d9688]">{item.charAt(0)}</strong>{item.slice(1)}</> : item}</span></li>)}</ul>}</section>)}</article><aside><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0d9688]">Kurumsal</p><nav className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{institutionalLinks.map(([label, href]) => <Link prefetch={false} key={href} href={`/kurumsal/${href}`} className={`block py-3 text-sm ${href === slug ? "font-black text-[#0d9688]" : "font-semibold text-slate-500 hover:text-[#0d9688]"}`}>{label}</Link>)}</nav></aside></div><Footer /></main>;
}
