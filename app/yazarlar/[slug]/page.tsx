import { Footer, Header } from "../../components/SiteChrome";
import { columns, writerBySlug } from "../../writers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { writers } from "../../writers";

export const dynamicParams = false;

export function generateStaticParams() {
  return writers.map((writer) => ({ slug: writer.slug }));
}

export default async function WriterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const writer = writerBySlug(slug);
  if (!writer) notFound();
  const pieces = columns.filter((column) => column.writerSlug === writer.slug);

  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]">
    <Header />
    <section className="bg-[#07172d] text-white"><div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-[100px_1fr] sm:items-center"><div className="grid h-24 w-24 place-items-center rounded-full border border-white/15 bg-white/5 text-3xl font-black text-[#59d8ca]">{writer.initials}</div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#59d8ca]">Yazar</p><h1 className="mt-2 text-4xl font-black">{writer.name}</h1><p className="mt-2 font-bold text-slate-300">{writer.role}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{writer.bio}</p></div></div></section>
    <section className="mx-auto max-w-5xl px-4 py-10"><p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">Bu profil ve ilişkili yazılar yerel önizleme için hazırlanmış demo içeriklerdir; gerçek yayın kadrosu veya yayın onayı sayılmaz.</p><p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-[#0d9688]">Uzmanlık alanları</p><p className="mt-2 font-bold">{writer.expertise}</p><h2 className="mt-10 border-b border-slate-200 pb-4 text-3xl font-black">Yazıları</h2><div className="divide-y divide-slate-200">{pieces.map((piece) => <Link prefetch={false} key={piece.slug} href={`/yazi/${piece.slug}`} className="group grid gap-2 py-4 transition hover:bg-white sm:grid-cols-[180px_1fr] sm:items-center sm:px-3"><time className="text-sm text-slate-400">{piece.published}</time><h3 className="text-lg font-semibold leading-snug group-hover:text-[#0d9688]">{piece.title}</h3></Link>)}</div><p className="mt-8 text-xs text-slate-400">Yazar görüşleri IVMOVA’nın kurumsal görüşünü temsil etmek zorunda değildir.</p></section>
    <Footer />
  </main>;
}
