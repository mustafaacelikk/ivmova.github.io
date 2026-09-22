import { news, type NewsItem } from "./data";

export type PublicEventDossier = {
  id: string;
  title: string;
  summary?: string;
  status: string;
  location?: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type ArticleSource = {
  name: string;
  articleUrl: string;
};

export async function getAllPublishedNews(): Promise<NewsItem[]> {
  return news;
}

export async function getPublishedArticle(slug: string): Promise<NewsItem | undefined> {
  return news.find((item) => item.slug === slug);
}

export async function getPublishedArticleEvent(_slug: string): Promise<PublicEventDossier | undefined> {
  return undefined;
}

export async function getPublishedArticleSource(_slug: string): Promise<ArticleSource | undefined> {
  return undefined;
}

export async function getPublicEventDossier(_id: string): Promise<{ dossier: PublicEventDossier; articles: NewsItem[] } | undefined> {
  return undefined;
}

export async function getPublicEventDossierIds(): Promise<string[]> {
  return [];
}
