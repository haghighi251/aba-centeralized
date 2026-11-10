export type HelpCategory =
  | "GETTING_STARTED"
  | "BUSINESS"
  | "TEAMS"
  | "ENVIRONMENTS"
  | "SERVICES"
  | "PACKAGES"
  | "TESTS"
  | "SECURITY"
  | "USERS"
  | "GITHUB_AUTOMATION"
  | "PLANS";

export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string };

export interface HelpArticleLink {
  label: string;
  /** Path below `/company/:companyId`, e.g. "/teams". Use "" for the dashboard. */
  path: string;
  /** When true, `path` is used as-is (e.g. "/pricing") instead of being prefixed. */
  absolute?: boolean;
}

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  /** Written as the question a customer would ask. */
  title: string;
  /** One-line summary, shown under the title and used by the search. */
  description: string;
  /** Extra words customers might type that aren't in the title or description. */
  keywords: string[];
  /** Shown in the "Popular questions" section when no search is active. */
  popular?: boolean;
  blocks: HelpBlock[];
  link?: HelpArticleLink;
}
