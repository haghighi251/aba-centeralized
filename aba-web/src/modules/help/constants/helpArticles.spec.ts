import { HELP_ARTICLES, HELP_CATEGORY_LABEL, HELP_CATEGORY_ORDER } from "./helpArticles";
import { searchHelpArticles } from "@/modules/help/helpers/searchHelpArticles";

describe("HELP_ARTICLES", () => {
  it("has unique ids", () => {
    const ids = HELP_ARTICLES.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses categories that have a label and an order entry", () => {
    for (const article of HELP_ARTICLES) {
      expect(HELP_CATEGORY_LABEL[article.category]).toBeDefined();
      expect(HELP_CATEGORY_ORDER).toContain(article.category);
    }
  });

  it("gives every article a title, description, keywords and content", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(article.description.length).toBeGreaterThan(0);
      expect(article.keywords.length).toBeGreaterThan(0);
      expect(article.blocks.length).toBeGreaterThan(0);
    }
  });

  describe("Bitbucket", () => {
    const article = HELP_ARTICLES.find((item) => item.id === "bb-connect");

    it("has a Bitbucket connect article", () => {
      expect(article).toBeDefined();
      expect(article?.title).toMatch(/Bitbucket/);
    });

    it("is listed as a popular question", () => {
      expect(article?.popular).toBe(true);
    });

    it("describes the Bitbucket Cloud setup steps and limitations", () => {
      const text = JSON.stringify(article?.blocks);
      expect(text).toMatch(/Repository: Push/);
      expect(text).toMatch(/Workspace/);
      expect(text).toMatch(/Repository slug/);
      expect(text).toMatch(/Data Center/);
    });

    it("is found by searching for 'bitbucket'", () => {
      const results = searchHelpArticles(HELP_ARTICLES, { query: "bitbucket" });
      expect(results.map((item) => item.id)).toContain("bb-connect");
    });

    it("is found by searching for 'bitbucket webhook'", () => {
      const results = searchHelpArticles(HELP_ARTICLES, { query: "bitbucket webhook" });
      expect(results.map((item) => item.id)).toContain("bb-connect");
    });

    it("is found by searching for 'workspace'", () => {
      const results = searchHelpArticles(HELP_ARTICLES, { query: "workspace" });
      expect(results.map((item) => item.id)).toContain("bb-connect");
    });
  });
});
