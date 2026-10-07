import type { MetadataRoute } from 'next';
import { siteNews } from './site-news';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin=process.env.NEXT_PUBLIC_IVMOVA_SITE_ORIGIN || 'https://ivmova.com';
  return siteNews.map(item => ({url:origin+'/haber/'+item.slug+'/',lastModified:item.updatedIso ?? item.publishedIso}));
}
