import type { HelpArticle, HelpCategory } from "@/modules/help/types/types";

export interface HelpSearchOptions {
  query: string;
  category?: HelpCategory | "";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Scores one article against the query tokens. Returns -1 when any token is
 * missing, so every word the customer typed must match somewhere in the
 * title, description or keywords. Title hits rank above description hits,
 * which rank above keyword hits.
 */
function scoreArticle(article: HelpArticle, tokens: string[]): number {
  const title = normalize(article.title);
  const description = normalize(article.description);
  const keywords = normalize(article.keywords.join(" "));

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 3;
    } else if (description.includes(token)) {
      score += 2;
    } else if (keywords.includes(token)) {
      score += 1;
    } else {
      return -1;
    }
  }
  return score;
}

/**
 * Filters help articles by category and free-text query. With an empty query
 * the original article order is kept; otherwise the best matches come first.
 */
export function searchHelpArticles(
  articles: HelpArticle[],
  { query, category = "" }: HelpSearchOptions,
): HelpArticle[] {
  const inCategory = category
    ? articles.filter((article) => article.category === category)
    : articles;

  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return inCategory;

  return inCategory
    .map((article, index) => ({ article, index, score: scoreArticle(article, tokens) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.article);
}
