import { Footer, Header } from "../../components/SiteChrome";
import { categoryMeta, type CategorySlug } from "../../data";
import { getAllPublishedNews } from "../../published-news";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryClient } from "./CategoryClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(categoryMeta).map((slug) => ({ slug }));
}

export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const category=slug as CategorySlug;
  const meta=categoryMeta[category];
  if(!meta) notFound();

  const publishedNews=await getAllPublishedNews();

  return <main className="min-h-screen bg-[#f4f7f7] text-[#0b1b33]">
    <Header/>
    <Suspense fallback={null}><CategoryClient category={category} publishedNews={publishedNews}/></Suspense>
    <Footer/>
  </main>;
}
