import { test, expect, type Page, type Route } from "@playwright/test";

// ── Constants ────────────────────────────────────────────────────────────────

const COMPANY_ID = "1";
const ENV_ID = "1";
const SERVICE_ID = "1";
const API_BASE = "http://localhost:8000";
const PAGE_URL = `/company/${COMPANY_ID}/environments/${ENV_ID}/services/${SERVICE_ID}/repository`;
const CONNECTION_API = `${API_BASE}/company/${COMPANY_ID}/environments/${ENV_ID}/services/${SERVICE_ID}/repository-connection`;

type Provider = "GITHUB" | "BITBUCKET";

interface MockConnection {
  id: number;
  provider: Provider;
  owner: string;
  name: string;
  watchedBranch: string;
  status: "ACTIVE" | "PAUSED";
  lastPingedAt: string | null;
  lastTriggeredAt: string | null;
  triggerMode: "INSTANT" | "PUSH_COUNT" | "TIME_INTERVAL";
  pushCountThreshold: number | null;
  intervalDays: number | null;
  pendingPushCount: number;
  serviceId: number;
  connectedById: number;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildConnection(overrides: Partial<MockConnection> = {}): MockConnection {
  return {
    id: 1,
    provider: "GITHUB",
    owner: "acme",
    name: "billing-api",
    watchedBranch: "main",
    status: "ACTIVE",
    lastPingedAt: null,
    lastTriggeredAt: null,
    triggerMode: "INSTANT",
    pushCountThreshold: null,
    intervalDays: null,
    pendingPushCount: 0,
    serviceId: 1,
    connectedById: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: status < 400, error: null, data }),
  });
}

function respondError(route: Route, message: string, status: number) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: false, error: message, data: null }),
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

interface ApiCalls {
  created: Record<string, unknown>[];
  triggerUpdates: Record<string, unknown>[];
  rotations: number;
  deletions: number;
}

/**
 * In-memory mock of the repository-connection endpoints. `alreadyConnected`
 * makes POST fail the way the API does when a service has a connection.
 */
async function mockConnectionApi(
  page: Page,
  initial: MockConnection | null = null,
  options: { alreadyConnected?: boolean } = {},
): Promise<ApiCalls> {
  let connection = initial ? { ...initial } : null;
  const calls: ApiCalls = { created: [], triggerUpdates: [], rotations: 0, deletions: 0 };

  await page.route(`${CONNECTION_API}**`, (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    if (method === "GET") return respond(route, connection);

    if (method === "POST" && path.endsWith("/rotate-secret")) {
      calls.rotations += 1;
      const provider = connection?.provider ?? "GITHUB";
      return respond(route, {
        connection,
        webhookUrl: `${API_BASE}/webhooks/${provider.toLowerCase()}/rotated-token`,
        webhookSecret: "rotated-secret",
      });
    }

    if (method === "POST") {
      if (options.alreadyConnected) {
        return respondError(route, "This service already has a connected repository.", 409);
      }
      const body = request.postDataJSON() as Record<string, unknown>;
      calls.created.push(body);
      connection = buildConnection({
        provider: body.provider as Provider,
        owner: body.owner as string,
        name: body.name as string,
        watchedBranch: body.watchedBranch as string,
      });
      return respond(
        route,
        {
          connection,
          webhookUrl: `${API_BASE}/webhooks/${(body.provider as string).toLowerCase()}/new-token`,
          webhookSecret: "fresh-secret",
        },
        201,
      );
    }

    if (method === "PUT" && path.endsWith("/trigger-settings")) {
      const body = request.postDataJSON() as Record<string, unknown>;
      calls.triggerUpdates.push(body);
      connection = { ...(connection as MockConnection), ...(body as Partial<MockConnection>) };
      return respond(route, connection);
    }

    if (method === "DELETE") {
      calls.deletions += 1;
      connection = null;
      return respond(route, null);
    }

    return route.continue();
  });

  return calls;
}

async function chooseOption(page: Page, selectLabel: string, option: string) {
  // The cadence "Mode" select has no accessible name, but it is the dialog's only combobox.
  const combobox =
    selectLabel === "Mode"
      ? page.getByRole("dialog").getByRole("combobox")
      : page.getByRole("combobox", { name: selectLabel });
  await combobox.click();
  await page.getByRole("option", { name: option }).click();
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Repository connection page", () => {
  test.describe("not connected", () => {
    test("shows the empty state and the Connect repository button", async ({ page }) => {
      await mockSession(page);
      await mockConnectionApi(page);
      await page.goto(PAGE_URL);

      await expect(page.getByRole("heading", { name: "Repository Connection" })).toBeVisible();
      await expect(page.getByText(/Connect a GitHub or Bitbucket repository/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Connect repository" })).toBeVisible();
    });

    test("hides the Connect repository button from a member", async ({ page }) => {
      await mockSession(page, "BUSINESS_MEMBER");
      await mockConnectionApi(page);
      await page.goto(PAGE_URL);

      await expect(page.getByText(/Connect a GitHub or Bitbucket repository/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Connect repository" })).toHaveCount(0);
    });
  });

  test.describe("connecting GitHub", () => {
    test("connects a repository and shows the one-time GitHub instructions", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page);
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Connect repository" }).click();
      await page.getByLabel(/^Owner/).fill("acme");
      await page.getByLabel(/^Repository name/).fill("billing-api");
      await page.getByRole("button", { name: "Connect", exact: true }).click();

      await expect(page.getByText("Repository connected")).toBeVisible();
      await expect(page.getByText(/In GitHub:/)).toBeVisible();
      await expect(page.locator("input[value$='/webhooks/github/new-token']")).toBeVisible();
      await expect(page.locator("input[value='fresh-secret']")).toBeVisible();
      expect(calls.created).toEqual([
        { provider: "GITHUB", owner: "acme", name: "billing-api", watchedBranch: "main" },
      ]);

      await page.getByRole("button", { name: "I've saved this" }).click();
      await expect(page.getByText("acme/billing-api")).toBeVisible();
      await expect(page.getByText("ACTIVE")).toBeVisible();
    });

    test("keeps Connect disabled until owner and name are filled", async ({ page }) => {
      await mockSession(page);
      await mockConnectionApi(page);
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Connect repository" }).click();
      const connect = page.getByRole("button", { name: "Connect", exact: true });
      await expect(connect).toBeDisabled();

      await page.getByLabel(/^Owner/).fill("acme");
      await expect(connect).toBeDisabled();

      await page.getByLabel(/^Repository name/).fill("billing-api");
      await expect(connect).toBeEnabled();
    });
  });

  test.describe("connecting Bitbucket", () => {
    test("shows Workspace / Repository slug labels after choosing Bitbucket", async ({ page }) => {
      await mockSession(page);
      await mockConnectionApi(page);
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Connect repository" }).click();
      await chooseOption(page, "Git provider", "Bitbucket");

      await expect(page.getByLabel(/^Workspace/)).toBeVisible();
      await expect(page.getByLabel(/^Repository slug/)).toBeVisible();
      await expect(page.getByLabel(/^Owner/)).toHaveCount(0);
    });

    test("connects a Bitbucket repository and shows the Bitbucket instructions", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page);
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Connect repository" }).click();
      await chooseOption(page, "Git provider", "Bitbucket");
      await page.getByLabel(/^Workspace/).fill("acme-workspace");
      await page.getByLabel(/^Repository slug/).fill("billing-api");
      await page.getByLabel("Watched branch").fill("develop");
      await page.getByRole("button", { name: "Connect", exact: true }).click();

      await expect(page.getByText("Repository connected")).toBeVisible();
      await expect(page.getByText(/In Bitbucket:/)).toBeVisible();
      await expect(page.getByText("Repository: Push")).toBeVisible();
      await expect(page.locator("input[value$='/webhooks/bitbucket/new-token']")).toBeVisible();
      await expect(page.getByText(/In GitHub:/)).toHaveCount(0);
      expect(calls.created).toEqual([
        {
          provider: "BITBUCKET",
          owner: "acme-workspace",
          name: "billing-api",
          watchedBranch: "develop",
        },
      ]);

      await page.getByRole("button", { name: "I've saved this" }).click();
      await expect(page.getByText("acme-workspace/billing-api")).toBeVisible();
      await expect(page.getByText("Bitbucket", { exact: true })).toBeVisible();
    });

    test("shows the API error and keeps the dialog open when the service is already connected", async ({
      page,
    }) => {
      await mockSession(page);
      await mockConnectionApi(page, null, { alreadyConnected: true });
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Connect repository" }).click();
      await chooseOption(page, "Git provider", "Bitbucket");
      await page.getByLabel(/^Workspace/).fill("acme-workspace");
      await page.getByLabel(/^Repository slug/).fill("billing-api");
      await page.getByRole("button", { name: "Connect", exact: true }).click();

      await expect(page.getByText(/already has a connected repository/)).toBeVisible();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  });

  test.describe("connected", () => {
    test("shows the Bitbucket connection details and manage buttons", async ({ page }) => {
      await mockSession(page);
      await mockConnectionApi(page, buildConnection({ provider: "BITBUCKET", owner: "acme-workspace" }));
      await page.goto(PAGE_URL);

      await expect(page.getByText("acme-workspace/billing-api")).toBeVisible();
      await expect(page.getByText("Bitbucket", { exact: true })).toBeVisible();
      await expect(page.getByText(/Last ping: never/)).toBeVisible();
      await expect(page.getByText(/Last triggered scan: never/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit cadence" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Regenerate secret" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Connect repository" })).toHaveCount(0);
    });

    test("hides every manage button from a member", async ({ page }) => {
      await mockSession(page, "BUSINESS_MEMBER");
      await mockConnectionApi(page, buildConnection({ provider: "BITBUCKET" }));
      await page.goto(PAGE_URL);

      await expect(page.getByText("acme/billing-api")).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit cadence" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Regenerate secret" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Disconnect" })).toHaveCount(0);
    });

    test("describes a PUSH_COUNT cadence with its progress counter", async ({ page }) => {
      await mockSession(page);
      await mockConnectionApi(
        page,
        buildConnection({ triggerMode: "PUSH_COUNT", pushCountThreshold: 5, pendingPushCount: 2 }),
      );
      await page.goto(PAGE_URL);

      await expect(page.getByText("Every 5 pushes (2/5 so far)")).toBeVisible();
    });

    test("describes a TIME_INTERVAL cadence with a queued push", async ({ page }) => {
      await mockSession(page);
      await mockConnectionApi(
        page,
        buildConnection({ triggerMode: "TIME_INTERVAL", intervalDays: 7, pendingPushCount: 1 }),
      );
      await page.goto(PAGE_URL);

      await expect(page.getByText("Every 7 day(s) — pending push queued")).toBeVisible();
    });
  });

  test.describe("Edit cadence", () => {
    test("saves a PUSH_COUNT cadence", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page, buildConnection({ provider: "BITBUCKET" }));
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Edit cadence" }).click();
      await chooseOption(page, "Mode", "Every N pushes");
      await page.getByLabel("Scan after this many matching pushes").fill("4");
      await page.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText(/Every 4 pushes/)).toBeVisible();
      expect(calls.triggerUpdates).toEqual([{ triggerMode: "PUSH_COUNT", pushCountThreshold: 4 }]);
    });

    test("saves a TIME_INTERVAL cadence", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page, buildConnection());
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Edit cadence" }).click();
      await chooseOption(page, "Mode", "Time interval");
      await page.getByLabel("Days between scans").fill("14");
      await page.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText("Every 14 day(s)")).toBeVisible();
      expect(calls.triggerUpdates).toEqual([{ triggerMode: "TIME_INTERVAL", intervalDays: 14 }]);
    });

    test("cancel closes the dialog without saving", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page, buildConnection());
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Edit cadence" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();

      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(calls.triggerUpdates).toHaveLength(0);
    });
  });

  test.describe("Regenerate secret", () => {
    test("reveals the new Bitbucket secret and URL", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page, buildConnection({ provider: "BITBUCKET" }));
      await page.goto(PAGE_URL);

      await page.getByRole("button", { name: "Regenerate secret" }).click();

      await expect(page.locator("input[value='rotated-secret']")).toBeVisible();
      await expect(page.locator("input[value$='/webhooks/bitbucket/rotated-token']")).toBeVisible();
      await expect(page.getByText(/In Bitbucket:/)).toBeVisible();
      expect(calls.rotations).toBe(1);
    });
  });

  test.describe("Disconnect", () => {
    test("disconnects after confirming and returns to the empty state", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page, buildConnection({ provider: "BITBUCKET" }));
      await page.goto(PAGE_URL);

      let dialogMessage = "";
      page.once("dialog", (dialog) => {
        dialogMessage = dialog.message();
        void dialog.accept();
      });
      await page.getByRole("button", { name: "Disconnect" }).click();

      await expect(page.getByText(/Connect a GitHub or Bitbucket repository/)).toBeVisible();
      expect(dialogMessage).toContain("Bitbucket deliveries");
      expect(calls.deletions).toBe(1);
    });

    test("does nothing when the confirmation is declined", async ({ page }) => {
      await mockSession(page);
      const calls = await mockConnectionApi(page, buildConnection());
      await page.goto(PAGE_URL);

      page.once("dialog", (dialog) => void dialog.dismiss());
      await page.getByRole("button", { name: "Disconnect" }).click();

      await expect(page.getByText("acme/billing-api")).toBeVisible();
      expect(calls.deletions).toBe(0);
    });
  });
});
