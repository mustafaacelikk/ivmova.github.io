import Link from "next/link";
import { Footer, Header } from "./components/SiteChrome";

export default function NotFound() {
  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1b33]"><Header /><section className="mx-auto max-w-4xl px-4 py-24"><p className="text-xs font-black uppercase tracking-[.2em] text-[#0d9688]">404</p><h1 className="mt-3 text-4xl font-black">Sayfa bulunamadı</h1><p className="mt-4 text-slate-500">Bu yerel statik önizlemede yalnızca aktarım paketindeki demo içerikler yer alır.</p><Link prefetch={false} href="/" className="mt-6 inline-block font-bold text-[#0d9688]">Ana sayfaya dön →</Link></section><Footer /></main>;
}
