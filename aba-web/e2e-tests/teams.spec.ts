import { test, expect, type Page, type Route } from "@playwright/test";

const COMPANY_ID = "1";

interface MockTeam {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

const BASE_TEAMS: MockTeam[] = [
  {
    id: 1,
    name: "Platform",
    slug: "platform",
    description: "Core platform team",
    status: "ACTIVE",
    companyId: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Growth",
    slug: "growth",
    description: null,
    status: "ARCHIVED",
    companyId: 1,
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-02-01T00:00:00.000Z",
  },
];

function envelope(data: unknown) {
  return { success: true, error: null, data };
}

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Mocks `/api/auth/session` so next-auth's `useSession()` resolves without a real backend. */
async function mockSession(page: Page, role: string) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role,
          companyId: COMPANY_ID,
          tokens: {
            accessToken: "test-access-token",
            refreshToken: "test-refresh-token",
            accessTokenExpires: Date.now() + 60 * 60 * 1000,
          },
        },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    }),
  );
}

const API_BASE_URL = "http://localhost:8000";

function filterTeams(teams: MockTeam[], url: URL) {
  let result = teams;
  const search = url.searchParams.get("search");
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }
  const status = url.searchParams.get("status");
  if (status) {
    result = result.filter((t) => t.status === status);
  }
  return result;
}

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(envelope(data)),
  });
}

/** Mocks the `/company/:id/teams...` endpoints with an in-memory list. */
async function mockTeamsApi(page: Page, initialTeams: MockTeam[] = BASE_TEAMS) {
  let teams = initialTeams.map((t) => ({ ...t }));
  let nextId = Math.max(...teams.map((t) => t.id)) + 1;

  const createTeam = (route: Route) => {
    const body = route.request().postDataJSON() as { name: string; description?: string | null };
    const created: MockTeam = {
      id: nextId,
      name: body.name,
      slug: slugify(body.name),
      description: body.description ?? null,
      status: "ACTIVE",
      companyId: Number(COMPANY_ID),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    nextId += 1;
    teams = [...teams, created];
    return respond(route, created, 201);
  };

  const updateTeam = (route: Route, id: number) => {
    const body = route.request().postDataJSON() as Partial<MockTeam>;
    teams = teams.map((t) => (t.id === id ? { ...t, ...body, updatedAt: new Date().toISOString() } : t));
    return respond(route, teams.find((t) => t.id === id));
  };

  const deleteTeam = (route: Route, id: number) => {
    teams = teams.filter((t) => t.id !== id);
    return respond(route, null);
  };

  await page.route(`${API_BASE_URL}/company/${COMPANY_ID}/teams**`, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const idMatch = url.pathname.match(/\/teams\/(\d+)$/);

    if (method === "GET" && !idMatch) {
      const result = filterTeams(teams, url);
      return respond(route, { data: result, total: result.length });
    }
    if (method === "POST") return createTeam(route);
    if (method === "PUT" && idMatch) return updateTeam(route, Number(idMatch[1]));
    if (method === "DELETE" && idMatch) return deleteTeam(route, Number(idMatch[1]));
    return route.continue();
  });
}

test.describe("Company Teams page", () => {
  test("lists teams and shows management controls for an owner", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    await page.goto(`/company/${COMPANY_ID}/teams`);

    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Team" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  });

  test("hides management controls for a member", async ({ page }) => {
    await mockSession(page, "BUSINESS_MEMBER");
    await mockTeamsApi(page);

    await page.goto(`/company/${COMPANY_ID}/teams`);

    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Team" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Actions" })).toHaveCount(0);
  });

  test("filters teams by search term", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    await page.goto(`/company/${COMPANY_ID}/teams`);
    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toBeVisible();

    await page.getByLabel("Search").fill("platform");

    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toBeVisible();
  });

  test("filters teams by status", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    await page.goto(`/company/${COMPANY_ID}/teams`);
    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toBeVisible();

    const statusFilter = page.locator(".MuiFormControl-root").filter({ hasText: "Status" });
    await statusFilter.getByRole("combobox").click();
    await page.getByRole("option", { name: "ARCHIVED" }).click();

    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toBeVisible();
  });

  test("creates a new team", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    await page.goto(`/company/${COMPANY_ID}/teams`);
    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add Team" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Team" })).toBeVisible();
    await dialog.getByLabel("Name *").fill("Security");
    await dialog.getByRole("button", { name: "Add Team" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Security", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "security", exact: true })).toBeVisible();
  });

  test("edits an existing team", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    await page.goto(`/company/${COMPANY_ID}/teams`);
    const platformRow = page.getByRole("row", { name: /Platform/ });
    await expect(platformRow).toBeVisible();

    await platformRow.getByRole("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit Team" })).toBeVisible();
    await expect(dialog.getByLabel("Name *")).toHaveValue("Platform");

    await dialog.getByLabel("Name *").fill("Platform Team");
    await dialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Platform Team", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toHaveCount(0);
  });

  test("deletes a team after confirmation", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    page.on("dialog", (dialog) => dialog.accept());

    await page.goto(`/company/${COMPANY_ID}/teams`);
    const platformRow = page.getByRole("row", { name: /Platform/ });
    await expect(platformRow).toBeVisible();

    await platformRow.getByRole("button").nth(1).click();

    await expect(page.getByRole("cell", { name: "Platform", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toBeVisible();
  });

  test("shows an error alert when loading fails", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await page.route(`${API_BASE_URL}/company/${COMPANY_ID}/teams**`, (route) => route.abort());

    await page.goto(`/company/${COMPANY_ID}/teams`);

    await expect(page.getByText("Failed to load teams.")).toBeVisible();
  });
});
