import { test, expect, type Page, type Route } from "@playwright/test";

// ── Constants ────────────────────────────────────────────────────────────────

const COMPANY_ID = "1";
const ENV_ID = "1";
const SERVICE_ID = "1";
const API_BASE = "http://localhost:8000";
const PAGE_URL = `/company/${COMPANY_ID}/environments/${ENV_ID}/services/${SERVICE_ID}/packages`;
const PACKAGES_API = `${API_BASE}/company/${COMPANY_ID}/environments/${ENV_ID}/services/${SERVICE_ID}/packages`;

// ── Types ────────────────────────────────────────────────────────────────────

interface MockPackage {
  id: number;
  ecosystem: string;
  name: string;
  version: string;
  createdAt: string;
}

interface MockServicePackage {
  id: number;
  status: "ACTIVE" | "STALE" | "REMOVED";
  versionRange: string | null;
  introducedAt: string;
  deactivatedAt: string | null;
  alarmCount: number;
  lastAlarmAt: string | null;
  serviceId: number;
  packageId: number;
  package: MockPackage;
  createdAt: string;
  updatedAt: string;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ACTIVE_PACKAGES: MockServicePackage[] = [
  {
    id: 1,
    status: "ACTIVE",
    versionRange: "^4.18.0",
    introducedAt: "2024-01-15T00:00:00.000Z",
    deactivatedAt: null,
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 1,
    package: {
      id: 1,
      ecosystem: "NPM",
      name: "express",
      version: "4.18.2",
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    status: "ACTIVE",
    versionRange: null,
    introducedAt: "2024-02-01T00:00:00.000Z",
    deactivatedAt: null,
    alarmCount: 2,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 2,
    package: {
      id: 2,
      ecosystem: "NPM",
      name: "lodash",
      version: "4.17.21",
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

const HISTORY_PACKAGES: MockServicePackage[] = [
  {
    id: 9,
    status: "STALE",
    versionRange: "^4.17.0",
    introducedAt: "2023-06-01T00:00:00.000Z",
    deactivatedAt: "2024-01-15T00:00:00.000Z",
    alarmCount: 1,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 10,
    package: {
      id: 10,
      ecosystem: "NPM",
      name: "express",
      version: "4.17.0",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: 8,
    status: "REMOVED",
    versionRange: null,
    introducedAt: "2023-01-01T00:00:00.000Z",
    deactivatedAt: "2023-12-01T00:00:00.000Z",
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 11,
    package: {
      id: 11,
      ecosystem: "NPM",
      name: "moment",
      version: "2.29.4",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-12-01T00:00:00.000Z",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function envelope(data: unknown) {
  return { success: true, error: null, data };
}

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(envelope(data)),
  });
}

async function mockSession(page: Page, role = "BUSINESS_OWNER") {
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

/**
 * Mocks the packages API with an in-memory active list and fixed history.
 * All route variants (list, history, create, update, delete, bulk) are handled.
 */
async function mockPackagesApi(
  page: Page,
  initial: MockServicePackage[] = ACTIVE_PACKAGES,
  history: MockServicePackage[] = HISTORY_PACKAGES,
) {
  let active = initial.map((p) => ({ ...p }));
  let nextId = 100;

  await page.route(`${PACKAGES_API}**`, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    // GET /packages/history
    if (method === "GET" && path.endsWith("/history")) {
      const statusFilter = url.searchParams.get("status") ?? "ALL";
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      let result = history;
      if (statusFilter !== "ALL") result = result.filter((p) => p.status === statusFilter);
      if (search) result = result.filter((p) => p.package.name.toLowerCase().includes(search));
      return respond(route, { data: result, total: result.length });
    }

    // POST /packages/bulk
    if (method === "POST" && path.endsWith("/bulk")) {
      const body = request.postDataJSON() as {
        packages: { name: string; version: string }[];
      };
      const added = body.packages.length;
      body.packages.forEach((pkg, i) => {
        active.push({
          id: nextId + i,
          status: "ACTIVE",
          versionRange: null,
          introducedAt: new Date().toISOString(),
          deactivatedAt: null,
          alarmCount: 0,
          lastAlarmAt: null,
          serviceId: 1,
          packageId: nextId + i,
          package: {
            id: nextId + i,
            ecosystem: "NPM",
            name: pkg.name,
            version: pkg.version,
            createdAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      nextId += body.packages.length;
      return respond(route, { added, updated: 0, unchanged: 0, staled: 0 }, 201);
    }

    // DELETE /packages/:id
    const delMatch = path.match(/\/packages\/(\d+)$/);
    if (method === "DELETE" && delMatch) {
      const id = Number(delMatch[1]);
      const removed = active.find((p) => p.id === id);
      active = active.filter((p) => p.id !== id);
      return respond(route, {
        ...removed,
        status: "REMOVED",
        deactivatedAt: new Date().toISOString(),
      });
    }

    // PUT /packages/:id
    const putMatch = path.match(/\/packages\/(\d+)$/);
    if (method === "PUT" && putMatch) {
      const id = Number(putMatch[1]);
      const body = request.postDataJSON() as {
        version?: string;
        versionRange?: string | null;
      };
      active = active.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          versionRange:
            body.versionRange !== undefined ? body.versionRange : p.versionRange,
          updatedAt: new Date().toISOString(),
          package:
            body.version !== undefined ? { ...p.package, version: body.version } : p.package,
        };
      });
      return respond(route, active.find((p) => p.id === id));
    }

    // GET /packages (active list)
    if (method === "GET") {
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const ecosystem = url.searchParams.get("ecosystem") ?? "";
      let result = active;
      if (search) result = result.filter((p) => p.package.name.toLowerCase().includes(search));
      if (ecosystem) result = result.filter((p) => p.package.ecosystem === ecosystem);
      return respond(route, { data: result, total: result.length });
    }

    // POST /packages (create)
    if (method === "POST") {
      const body = request.postDataJSON() as {
        name: string;
        version: string;
        ecosystem?: string;
        versionRange?: string | null;
      };
      const created: MockServicePackage = {
        id: nextId++,
        status: "ACTIVE",
        versionRange: body.versionRange ?? null,
        introducedAt: new Date().toISOString(),
        deactivatedAt: null,
        alarmCount: 0,
        lastAlarmAt: null,
        serviceId: 1,
        packageId: nextId,
        package: {
          id: nextId,
          ecosystem: body.ecosystem ?? "NPM",
          name: body.name,
          version: body.version,
          createdAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      active = [...active, created];
      return respond(route, created, 201);
    }

    return route.continue();
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Packages page", () => {

  // ── List & RBAC ───────────────────────────────────────────────────────────

  test("renders the active package list for a BUSINESS_OWNER", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);

    await expect(page.getByRole("heading", { name: "Packages" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "lodash", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "4.18.2", exact: true })).toBeVisible();
  });

  test("shows management buttons only for managers", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);

    await expect(page.getByRole("button", { name: "Add Package" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload package.json" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  });

  test("hides management buttons for BUSINESS_MEMBER", async ({ page }) => {
    await mockSession(page, "BUSINESS_MEMBER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);

    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Package" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Upload package.json" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Actions" })).toHaveCount(0);
  });

  test("View History button is visible to all roles including BUSINESS_MEMBER", async ({ page }) => {
    await mockSession(page, "BUSINESS_MEMBER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);

    await expect(page.getByRole("button", { name: "View History" })).toBeVisible();
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  test("filters packages by search term", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await expect(page.getByRole("cell", { name: "lodash", exact: true })).toBeVisible();

    await page.getByLabel("Search").fill("express");

    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "lodash", exact: true })).toHaveCount(0);
  });

  test("filters packages by ecosystem", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");

    const mixed: MockServicePackage[] = [
      ...ACTIVE_PACKAGES,
      {
        id: 3,
        status: "ACTIVE",
        versionRange: null,
        introducedAt: "2024-03-01T00:00:00.000Z",
        deactivatedAt: null,
        alarmCount: 0,
        lastAlarmAt: null,
        serviceId: 1,
        packageId: 3,
        package: {
          id: 3,
          ecosystem: "PYPI",
          name: "requests",
          version: "2.31.0",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    await mockPackagesApi(page, mixed);

    await page.goto(PAGE_URL);
    await expect(page.getByRole("cell", { name: "requests", exact: true })).toBeVisible();

    const ecosystemFilter = page.locator(".MuiFormControl-root").filter({ hasText: "Ecosystem" });
    await ecosystemFilter.getByRole("combobox").click();
    await page.getByRole("option", { name: "NPM" }).click();

    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "requests", exact: true })).toHaveCount(0);
  });

  // ── Create ────────────────────────────────────────────────────────────────

  test("creates a new package", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add Package" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Package" })).toBeVisible();

    // Use aria-label values (set via inputProps) — these match what getByLabel resolves
    await dialog.getByLabel("Package Name").fill("axios");
    await dialog.getByLabel("Version", { exact: true }).fill("1.6.0");
    await dialog.getByLabel("Version Range").fill("^1.6.0");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "axios", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "1.6.0", exact: true })).toBeVisible();
  });

  test("Save button is disabled until both name and version are filled", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "Add Package" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Package" })).toBeVisible();

    // Initially disabled
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();

    // Name only — still disabled
    await dialog.getByLabel("Package Name").fill("axios");
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();

    // Name + Version — now enabled
    await dialog.getByLabel("Version", { exact: true }).fill("1.0.0");
    await expect(dialog.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  // ── Edit ──────────────────────────────────────────────────────────────────

  test("edits a package versionRange in place", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();

    await page.getByRole("row", { name: /express/ }).getByRole("button", { name: "Edit express" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit Package" })).toBeVisible();

    // Package Name is disabled in edit mode
    await expect(dialog.getByLabel("Package Name")).toBeDisabled();
    await expect(dialog.getByLabel("Package Name")).toHaveValue("express");

    // Update versionRange only (no version change → no stale-and-replace)
    await dialog.getByLabel("Version Range").fill("^4.19.0");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toHaveCount(0);
  });

  test("shows version-change warning when version is modified during edit", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();

    await page.getByRole("row", { name: /express/ }).getByRole("button", { name: "Edit express" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit Package" })).toBeVisible();

    await dialog.getByLabel("Version", { exact: true }).fill("5.0.0");

    await expect(
      dialog.getByText("Changing the version will mark the current version as stale."),
    ).toBeVisible();
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  test("deletes a package after confirmation", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    page.on("dialog", (d) => d.accept());

    await page.goto(PAGE_URL);
    await expect(page.getByRole("cell", { name: "lodash", exact: true })).toBeVisible();

    await page.getByRole("row", { name: /lodash/ }).getByRole("button", { name: "Delete lodash" }).click();

    await expect(page.getByRole("cell", { name: "lodash", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "express", exact: true })).toBeVisible();
  });

  test("does not delete when confirm is dismissed", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    page.on("dialog", (d) => d.dismiss());

    await page.goto(PAGE_URL);
    await page.getByRole("row", { name: /lodash/ }).getByRole("button", { name: "Delete lodash" }).click();

    await expect(page.getByRole("cell", { name: "lodash", exact: true })).toBeVisible();
  });

  // ── History dialog ────────────────────────────────────────────────────────

  test("opens history dialog and shows stale and removed packages", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "View History" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Package History" })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "express", exact: true })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "4.17.0", exact: true })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "moment", exact: true })).toBeVisible();
    await expect(dialog.getByText("Stale")).toBeVisible();
    await expect(dialog.getByText("Removed")).toBeVisible();
  });

  test("filters history to STALE only", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "View History" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Package History" })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "moment", exact: true })).toBeVisible();

    const statusFilter = dialog.locator(".MuiFormControl-root").filter({ hasText: "Status" });
    await statusFilter.getByRole("combobox").click();
    await page.getByRole("option", { name: "Stale" }).click();

    await expect(dialog.getByRole("cell", { name: "4.17.0", exact: true })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "moment", exact: true })).toHaveCount(0);
  });

  test("searches within the history dialog", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "View History" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Package History" })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "moment", exact: true })).toBeVisible();

    await dialog.getByLabel("Search").fill("express");

    await expect(dialog.getByRole("cell", { name: "express", exact: true })).toBeVisible();
    await expect(dialog.getByRole("cell", { name: "moment", exact: true })).toHaveCount(0);
  });

  test("closes the history dialog", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "View History" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  // ── Bulk import ───────────────────────────────────────────────────────────

  test("bulk-imports packages from an uploaded package.json", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "Upload package.json" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Upload package.json" })).toBeVisible();

    const packageJson = JSON.stringify({
      dependencies: { axios: "^1.6.0", "react-query": "^5.0.0" },
    });
    await dialog.locator("input[type='file']").setInputFiles({
      name: "package.json",
      mimeType: "application/json",
      buffer: Buffer.from(packageJson),
    });

    await expect(dialog.getByText(/Found 2 packages to import/)).toBeVisible();
    await expect(dialog.getByText("axios")).toBeVisible();
    await expect(dialog.getByText("react-query")).toBeVisible();

    await dialog.getByRole("button", { name: /^Import/ }).click();

    await expect(dialog.getByText(/Added: 2/)).toBeVisible();
    await expect(dialog.getByText(/Updated: 0/)).toBeVisible();
  });

  test("shows a parse error when an invalid JSON file is uploaded", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "Upload package.json" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Upload package.json" })).toBeVisible();

    await dialog.locator("input[type='file']").setInputFiles({
      name: "package.json",
      mimeType: "application/json",
      buffer: Buffer.from("not valid json"),
    });

    await expect(
      dialog.getByText("Failed to parse file. Please upload a valid package.json."),
    ).toBeVisible();
  });

  test("Import button is not shown before a file is chosen", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await page.getByRole("button", { name: "Upload package.json" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Upload package.json" })).toBeVisible();

    // Import button only appears after a file is parsed — not before
    await expect(dialog.getByRole("button", { name: /^Import/ })).toHaveCount(0);
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  test("back button navigates to the services list", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page);

    await page.goto(PAGE_URL);
    await expect(page.getByRole("heading", { name: "Packages" })).toBeVisible();

    await page.getByRole("button", { name: "Back to services" }).click();

    // The environments page is rarely visited elsewhere in this suite, so Next's
    // dev-mode on-demand compilation can take a few seconds here (see the same
    // pattern in profile-menu.spec.ts) — give it more room than the default 5s.
    await expect(page).toHaveURL(
      `/company/${COMPANY_ID}/environments/${ENV_ID}`,
      { timeout: 90000 },
    );
  });

  // ── Error state ───────────────────────────────────────────────────────────

  test("shows an error when the packages API returns a network failure", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await page.route(`${PACKAGES_API}**`, (route) => route.abort());

    await page.goto(PAGE_URL);

    await expect(page.getByRole("alert")).toBeVisible();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  test("shows the empty state when the service has no packages", async ({ page }) => {
    await mockSession(page, "BUSINESS_OWNER");
    await mockPackagesApi(page, []);

    await page.goto(PAGE_URL);

    await expect(
      page.getByText("No active packages for this service."),
    ).toBeVisible();
  });
});
