import { test, expect, type Page, type Route } from "@playwright/test";

const COMPANY_ID = "1";
const API_BASE_URL = "http://localhost:8000";

function envelope(data: unknown) {
  return { success: true, error: null, data };
}

/** Mocks `/api/auth/session` so next-auth's `useSession()` resolves without a real backend. */
async function mockSession(page: Page, role: string, companyId: string | null = COMPANY_ID) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role,
          companyId,
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

/** Mocks the `/company/:id/teams` list endpoint used by the Teams page. */
async function mockTeamsApi(page: Page) {
  await page.route(`${API_BASE_URL}/company/${COMPANY_ID}/teams**`, (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(envelope({ data: [], total: 0 })),
    }),
  );
}

/** Opens the top-right profile dropdown (the "Settings" tooltip icon in the AppBar). */
async function openProfileMenu(page: Page) {
  // Retry the click until the menu opens: a click that lands before React hydrates is
  // silently dropped (seen on Firefox with a cold Next.js dev server).
  await expect(async () => {
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("menuitem", { name: "Dashboard" }).first()).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
}

test.describe("Top-right profile menu", () => {
  test("lets a business owner reach every company dashboard section", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockTeamsApi(page);

    await page.goto("/");
    await openProfileMenu(page);

    await expect(page.getByRole("menuitem", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Business Details" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Teams" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Environments" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Pricing & Plans" })).toBeVisible();

    // Clicking a section actually navigates there (this used to silently no-op).
    // Generous timeout: Next.js dev mode compiles this route on demand the first
    // time it's visited, which can take much longer than Playwright's default 5s.
    await page.getByRole("menuitem", { name: "Teams" }).click();
    await expect(page).toHaveURL(new RegExp(`/company/${COMPANY_ID}/teams$`), { timeout: 90000 });
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
  });

  test("hides the Users section for a business member", async ({ page }) => {
    await mockSession(page, "BUSINESS_MEMBER");

    await page.goto("/");
    await openProfileMenu(page);

    await expect(page.getByRole("menuitem", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Users" })).toHaveCount(0);
  });

  test("lets a platform admin reach the admin sections", async ({ page }) => {
    await mockSession(page, "SUPER_ADMIN", null);

    await page.goto("/");
    await openProfileMenu(page);

    await expect(page.getByRole("menuitem", { name: "Admin Dashboard" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Customer List" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Customer List" }).click();
    await expect(page).toHaveURL(/\/admin\/customers$/, { timeout: 90000 });
  });
});
