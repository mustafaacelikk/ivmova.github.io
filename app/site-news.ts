import { news as demoNews, type NewsItem } from './data';
import generated from './site-news.generated.json';
export const publicationMode = process.env.NEXT_PUBLIC_IVMOVA_CONTENT_MODE === 'publication';
export const routeNews: NewsItem[] = publicationMode ? generated.items as NewsItem[] : demoNews;
export const siteNews = routeNews.filter(item => item.publicationStatus !== 'RETRACTED');
