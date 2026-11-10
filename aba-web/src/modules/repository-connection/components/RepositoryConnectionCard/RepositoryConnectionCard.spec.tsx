import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import RepositoryConnectionCard from "./RepositoryConnectionCard";
import * as service from "@/modules/repository-connection/services/repositoryConnectionService";
import type {
  RepositoryConnection,
  RepositoryConnectionSecretReveal,
} from "@/modules/repository-connection/types/types";

jest.mock("@/modules/repository-connection/services/repositoryConnectionService");

const mockedService = service as jest.Mocked<typeof service>;

const TOKEN = "test-token";

const githubConnection: RepositoryConnection = {
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
  serviceId: 3,
  connectedById: 5,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const bitbucketConnection: RepositoryConnection = {
  ...githubConnection,
  provider: "BITBUCKET",
  owner: "acme-workspace",
};

function reveal(connection: RepositoryConnection): RepositoryConnectionSecretReveal {
  const path = connection.provider === "BITBUCKET" ? "bitbucket" : "github";
  return {
    connection,
    webhookUrl: `https://api.example.com/webhooks/${path}/token-1`,
    webhookSecret: "super-secret-value",
  };
}

const onChanged = jest.fn();

function renderCard(
  props: Partial<React.ComponentProps<typeof RepositoryConnectionCard>> = {},
) {
  return render(
    <RepositoryConnectionCard
      companyId="1"
      environmentId={2}
      serviceId={3}
      accessToken={TOKEN}
      connection={null}
      loading={false}
      canManage={true}
      onChanged={onChanged}
      {...props}
    />,
  );
}

function getSelect(labelText: string) {
  const label = screen.getByText(labelText, { selector: "label" });
  const formControl = label.closest(".MuiFormControl-root") as HTMLElement;
  return within(formControl).getByRole("combobox");
}

async function openConnectDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Connect repository" }));
  await screen.findByRole("dialog");
}

async function chooseProvider(name: "GitHub" | "Bitbucket") {
  fireEvent.mouseDown(getSelect("Git provider"));
  fireEvent.click(await screen.findByRole("option", { name }));
}

describe("RepositoryConnectionCard", () => {
  const writeText = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText } });
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  // ── empty / loading states ──

  describe("not connected", () => {
    it("shows the empty-state text mentioning both providers", () => {
      renderCard();
      expect(screen.getByText(/Connect a GitHub or Bitbucket repository/)).toBeInTheDocument();
    });

    it("shows the Connect repository button to managers", () => {
      renderCard();
      expect(screen.getByRole("button", { name: "Connect repository" })).toBeInTheDocument();
    });

    it("hides the Connect repository button from non-managers", () => {
      renderCard({ canManage: false });
      expect(screen.queryByRole("button", { name: "Connect repository" })).not.toBeInTheDocument();
    });

    it("shows a spinner and no Connect button while loading", () => {
      renderCard({ loading: true });
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Connect repository" })).not.toBeInTheDocument();
    });
  });

  // ── connected status panel ──

  describe("connected", () => {
    it("shows the repo, provider, branch and status for GitHub", () => {
      renderCard({ connection: githubConnection });
      expect(screen.getByText("acme/billing-api")).toBeInTheDocument();
      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("main")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByTestId("GitHubIcon")).toBeInTheDocument();
    });

    it("shows the Bitbucket provider chip and icon for a Bitbucket connection", () => {
      renderCard({ connection: bitbucketConnection });
      expect(screen.getByText("acme-workspace/billing-api")).toBeInTheDocument();
      expect(screen.getByText("Bitbucket")).toBeInTheDocument();
      expect(screen.getByTestId("CodeIcon")).toBeInTheDocument();
      expect(screen.queryByTestId("GitHubIcon")).not.toBeInTheDocument();
    });

    it("shows 'never' for last ping and last triggered scan when there are none", () => {
      renderCard({ connection: githubConnection });
      expect(screen.getByText(/Last ping: never/)).toBeInTheDocument();
      expect(screen.getByText(/Last triggered scan: never/)).toBeInTheDocument();
    });

    it("shows formatted timestamps when present", () => {
      renderCard({
        connection: {
          ...githubConnection,
          lastPingedAt: "2024-03-01T10:00:00.000Z",
          lastTriggeredAt: "2024-03-02T10:00:00.000Z",
        },
      });
      expect(screen.queryByText(/Last ping: never/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Last triggered scan: never/)).not.toBeInTheDocument();
    });

    it("styles a PAUSED connection's status chip", () => {
      renderCard({ connection: { ...githubConnection, status: "PAUSED" } });
      expect(screen.getByText("PAUSED")).toBeInTheDocument();
    });

    it("hides the Connect repository button once connected", () => {
      renderCard({ connection: githubConnection });
      expect(screen.queryByRole("button", { name: "Connect repository" })).not.toBeInTheDocument();
    });

    it.each([
      [{ triggerMode: "INSTANT" as const }, "Instant — scans on every push"],
      [
        { triggerMode: "PUSH_COUNT" as const, pushCountThreshold: 3, pendingPushCount: 2 },
        "Every 3 pushes (2/3 so far)",
      ],
      [
        { triggerMode: "TIME_INTERVAL" as const, intervalDays: 7, pendingPushCount: 0 },
        "Every 7 day(s)",
      ],
      [
        { triggerMode: "TIME_INTERVAL" as const, intervalDays: 7, pendingPushCount: 1 },
        "Every 7 day(s) — pending push queued",
      ],
    ])("describes the cadence %j as '%s'", (overrides, label) => {
      renderCard({ connection: { ...githubConnection, ...overrides } });
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("shows the manage buttons to managers", () => {
      renderCard({ connection: bitbucketConnection });
      expect(screen.getByRole("button", { name: "Edit cadence" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Regenerate secret" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    });

    it("hides the manage buttons from non-managers", () => {
      renderCard({ connection: bitbucketConnection, canManage: false });
      expect(screen.queryByRole("button", { name: "Edit cadence" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Regenerate secret" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
    });
  });

  // ── connect dialog ──

  describe("connect dialog", () => {
    it("opens with GitHub selected and GitHub field labels", async () => {
      renderCard();
      await openConnectDialog();

      expect(within(getSelect("Git provider")).queryByText("GitHub")).not.toBeNull();
      expect(screen.getByLabelText(/^Owner/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Repository name/)).toBeInTheDocument();
      expect(screen.getByLabelText("Watched branch")).toHaveValue("main");
    });

    it("offers both providers", async () => {
      renderCard();
      await openConnectDialog();

      fireEvent.mouseDown(getSelect("Git provider"));

      expect(await screen.findByRole("option", { name: "GitHub" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Bitbucket" })).toBeInTheDocument();
    });

    it("switches the field labels to Workspace / Repository slug for Bitbucket", async () => {
      renderCard();
      await openConnectDialog();

      await chooseProvider("Bitbucket");

      expect(screen.getByLabelText(/^Workspace/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Repository slug/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Owner/)).not.toBeInTheDocument();
    });

    it("disables Connect until both owner and name are filled (whitespace does not count)", async () => {
      renderCard();
      await openConnectDialog();
      const connect = screen.getByRole("button", { name: "Connect" });
      expect(connect).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^Owner/), { target: { value: "acme" } });
      expect(connect).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^Repository name/), { target: { value: "   " } });
      expect(connect).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^Repository name/), { target: { value: "billing-api" } });
      expect(connect).toBeEnabled();
    });

    it("submits a GitHub connection with provider GITHUB", async () => {
      mockedService.createRepositoryConnection.mockResolvedValue(reveal(githubConnection));
      renderCard();
      await openConnectDialog();
      fireEvent.change(screen.getByLabelText(/^Owner/), { target: { value: "acme" } });
      fireEvent.change(screen.getByLabelText(/^Repository name/), { target: { value: "billing-api" } });

      fireEvent.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() =>
        expect(mockedService.createRepositoryConnection).toHaveBeenCalledWith(
          "1",
          2,
          3,
          { provider: "GITHUB", owner: "acme", name: "billing-api", watchedBranch: "main" },
          TOKEN,
        ),
      );
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("submits a Bitbucket connection with provider BITBUCKET and the entered branch", async () => {
      mockedService.createRepositoryConnection.mockResolvedValue(reveal(bitbucketConnection));
      renderCard();
      await openConnectDialog();
      await chooseProvider("Bitbucket");
      fireEvent.change(screen.getByLabelText(/^Workspace/), { target: { value: "acme-workspace" } });
      fireEvent.change(screen.getByLabelText(/^Repository slug/), { target: { value: "billing-api" } });
      fireEvent.change(screen.getByLabelText("Watched branch"), { target: { value: "develop" } });

      fireEvent.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() =>
        expect(mockedService.createRepositoryConnection).toHaveBeenCalledWith(
          "1",
          2,
          3,
          {
            provider: "BITBUCKET",
            owner: "acme-workspace",
            name: "billing-api",
            watchedBranch: "develop",
          },
          TOKEN,
        ),
      );
    });

    it("falls back to 'main' when the branch is cleared", async () => {
      mockedService.createRepositoryConnection.mockResolvedValue(reveal(githubConnection));
      renderCard();
      await openConnectDialog();
      fireEvent.change(screen.getByLabelText(/^Owner/), { target: { value: "acme" } });
      fireEvent.change(screen.getByLabelText(/^Repository name/), { target: { value: "billing-api" } });
      fireEvent.change(screen.getByLabelText("Watched branch"), { target: { value: "" } });

      fireEvent.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() =>
        expect(mockedService.createRepositoryConnection).toHaveBeenCalledWith(
          "1",
          2,
          3,
          expect.objectContaining({ watchedBranch: "main" }),
          TOKEN,
        ),
      );
    });

    it("shows the API error and keeps the dialog open when connecting fails", async () => {
      mockedService.createRepositoryConnection.mockRejectedValue(new Error("boom"));
      mockedService.getRepositoryConnectionErrorMessage.mockReturnValue(
        "This service already has a connected repository. Disconnect it first.",
      );
      renderCard();
      await openConnectDialog();
      fireEvent.change(screen.getByLabelText(/^Owner/), { target: { value: "acme" } });
      fireEvent.change(screen.getByLabelText(/^Repository name/), { target: { value: "billing-api" } });

      fireEvent.click(screen.getByRole("button", { name: "Connect" }));

      expect(await screen.findByText(/already has a connected repository/)).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();
      expect(mockedService.getRepositoryConnectionErrorMessage).toHaveBeenCalledWith(
        expect.any(Error),
        "Failed to connect repository.",
      );
    });

    it("resets the form (provider included) every time the dialog is reopened", async () => {
      renderCard();
      await openConnectDialog();
      await chooseProvider("Bitbucket");
      fireEvent.change(screen.getByLabelText(/^Workspace/), { target: { value: "acme" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      await openConnectDialog();

      expect(screen.getByLabelText(/^Owner/)).toHaveValue("");
    });

    it("closes without calling the API on Cancel", async () => {
      renderCard();
      await openConnectDialog();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockedService.createRepositoryConnection).not.toHaveBeenCalled();
    });
  });

  // ── one-time secret reveal ──

  describe("secret reveal", () => {
    async function connectAs(provider: "GitHub" | "Bitbucket") {
      const connection = provider === "GitHub" ? githubConnection : bitbucketConnection;
      mockedService.createRepositoryConnection.mockResolvedValue(reveal(connection));
      renderCard();
      await openConnectDialog();
      if (provider === "Bitbucket") await chooseProvider("Bitbucket");
      fireEvent.change(screen.getByLabelText(provider === "GitHub" ? /^Owner/ : /^Workspace/), {
        target: { value: "acme" },
      });
      fireEvent.change(
        screen.getByLabelText(provider === "GitHub" ? /^Repository name/ : /^Repository slug/),
        { target: { value: "billing-api" } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
      await screen.findByText("Repository connected");
    }

    it("shows the GitHub Payload URL, the secret and GitHub setup instructions", async () => {
      await connectAs("GitHub");

      expect(screen.getByText("Payload URL")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://api.example.com/webhooks/github/token-1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("super-secret-value")).toBeInTheDocument();
      expect(screen.getByText(/In GitHub:/)).toBeInTheDocument();
      expect(screen.getByText("application/json")).toBeInTheDocument();
      expect(screen.queryByText(/In Bitbucket:/)).not.toBeInTheDocument();
    });

    it("shows the Bitbucket webhook URL, the secret and Bitbucket setup instructions", async () => {
      await connectAs("Bitbucket");

      expect(screen.getByText("Webhook URL")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://api.example.com/webhooks/bitbucket/token-1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("super-secret-value")).toBeInTheDocument();
      expect(screen.getByText(/In Bitbucket:/)).toBeInTheDocument();
      expect(screen.getByText("Repository: Push")).toBeInTheDocument();
      expect(screen.queryByText(/In GitHub:/)).not.toBeInTheDocument();
      expect(screen.queryByText("Payload URL")).not.toBeInTheDocument();
    });

    it("warns that the secret is shown only once", async () => {
      await connectAs("GitHub");
      expect(screen.getByText(/shown only once/)).toBeInTheDocument();
    });

    it("copies the URL and the secret to the clipboard", async () => {
      await connectAs("Bitbucket");

      fireEvent.click(screen.getByLabelText("Copy webhook URL"));
      fireEvent.click(screen.getByLabelText("Copy webhook secret"));

      expect(writeText).toHaveBeenCalledWith("https://api.example.com/webhooks/bitbucket/token-1");
      expect(writeText).toHaveBeenCalledWith("super-secret-value");
    });

    it("does not crash when the clipboard API is unavailable", async () => {
      await connectAs("GitHub");
      Object.assign(navigator, { clipboard: undefined });

      expect(() => fireEvent.click(screen.getByLabelText("Copy webhook URL"))).not.toThrow();
    });

    it("dismisses the secret with 'I've saved this'", async () => {
      await connectAs("GitHub");

      fireEvent.click(screen.getByRole("button", { name: "I've saved this" }));

      await waitFor(() => expect(screen.queryByText("Repository connected")).not.toBeInTheDocument());
      expect(screen.queryByDisplayValue("super-secret-value")).not.toBeInTheDocument();
    });
  });

  // ── regenerate secret ──

  describe("Regenerate secret", () => {
    it("rotates the secret and reveals the new Bitbucket URL and instructions", async () => {
      mockedService.rotateRepositoryConnectionSecret.mockResolvedValue({
        ...reveal(bitbucketConnection),
        webhookUrl: "https://api.example.com/webhooks/bitbucket/new-token",
        webhookSecret: "new-secret",
      });
      renderCard({ connection: bitbucketConnection });

      fireEvent.click(screen.getByRole("button", { name: "Regenerate secret" }));

      expect(await screen.findByDisplayValue("new-secret")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://api.example.com/webhooks/bitbucket/new-token")).toBeInTheDocument();
      expect(screen.getByText(/In Bitbucket:/)).toBeInTheDocument();
      expect(mockedService.rotateRepositoryConnectionSecret).toHaveBeenCalledWith("1", 2, 3, TOKEN);
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("reveals GitHub instructions when a GitHub connection is rotated", async () => {
      mockedService.rotateRepositoryConnectionSecret.mockResolvedValue(reveal(githubConnection));
      renderCard({ connection: githubConnection });

      fireEvent.click(screen.getByRole("button", { name: "Regenerate secret" }));

      expect(await screen.findByText(/In GitHub:/)).toBeInTheDocument();
    });

    it("shows an error alert when rotation fails", async () => {
      mockedService.rotateRepositoryConnectionSecret.mockRejectedValue(new Error("x"));
      mockedService.getRepositoryConnectionErrorMessage.mockReturnValue("Failed to rotate secret.");
      renderCard({ connection: githubConnection });

      fireEvent.click(screen.getByRole("button", { name: "Regenerate secret" }));

      expect(await screen.findByText("Failed to rotate secret.")).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();
    });
  });

  // ── disconnect ──

  describe("Disconnect", () => {
    it("asks for confirmation naming the provider and does nothing when declined", () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      renderCard({ connection: bitbucketConnection });

      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Bitbucket deliveries"));
      expect(mockedService.deleteRepositoryConnection).not.toHaveBeenCalled();
      expect(onChanged).not.toHaveBeenCalled();
    });

    it("names GitHub in the confirmation for a GitHub connection", () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      renderCard({ connection: githubConnection });

      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("GitHub deliveries"));
    });

    it("deletes the connection and refreshes when confirmed", async () => {
      mockedService.deleteRepositoryConnection.mockResolvedValue(undefined);
      renderCard({ connection: bitbucketConnection });

      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

      await waitFor(() =>
        expect(mockedService.deleteRepositoryConnection).toHaveBeenCalledWith("1", 2, 3, TOKEN),
      );
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("shows an error alert when disconnecting fails, and the alert can be dismissed", async () => {
      mockedService.deleteRepositoryConnection.mockRejectedValue(new Error("x"));
      mockedService.getRepositoryConnectionErrorMessage.mockReturnValue("Failed to disconnect repository.");
      renderCard({ connection: githubConnection });

      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

      expect(await screen.findByText("Failed to disconnect repository.")).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() =>
        expect(screen.queryByText("Failed to disconnect repository.")).not.toBeInTheDocument(),
      );
    });
  });

  // ── edit cadence ──

  describe("Edit cadence", () => {
    it("opens pre-filled with the current mode", () => {
      renderCard({
        connection: {
          ...bitbucketConnection,
          triggerMode: "PUSH_COUNT",
          pushCountThreshold: 4,
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Edit cadence" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Scan after this many matching pushes")).toHaveValue(4);
    });

    it("saves INSTANT without threshold or interval", async () => {
      mockedService.updateRepositoryConnectionTriggerSettings.mockResolvedValue(githubConnection);
      renderCard({ connection: { ...bitbucketConnection, triggerMode: "PUSH_COUNT", pushCountThreshold: 4 } });
      fireEvent.click(screen.getByRole("button", { name: "Edit cadence" }));
      fireEvent.mouseDown(getSelect("Mode"));
      fireEvent.click(await screen.findByRole("option", { name: "Instant" }));

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(mockedService.updateRepositoryConnectionTriggerSettings).toHaveBeenCalledWith(
          "1",
          2,
          3,
          { triggerMode: "INSTANT" },
          TOKEN,
        ),
      );
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("saves PUSH_COUNT with the entered number of pushes", async () => {
      mockedService.updateRepositoryConnectionTriggerSettings.mockResolvedValue(githubConnection);
      renderCard({ connection: bitbucketConnection });
      fireEvent.click(screen.getByRole("button", { name: "Edit cadence" }));
      fireEvent.mouseDown(getSelect("Mode"));
      fireEvent.click(await screen.findByRole("option", { name: "Every N pushes" }));
      fireEvent.change(screen.getByLabelText("Scan after this many matching pushes"), {
        target: { value: "8" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(mockedService.updateRepositoryConnectionTriggerSettings).toHaveBeenCalledWith(
          "1",
          2,
          3,
          { triggerMode: "PUSH_COUNT", pushCountThreshold: 8 },
          TOKEN,
        ),
      );
    });

    it("saves TIME_INTERVAL with the entered number of days", async () => {
      mockedService.updateRepositoryConnectionTriggerSettings.mockResolvedValue(githubConnection);
      renderCard({ connection: githubConnection });
      fireEvent.click(screen.getByRole("button", { name: "Edit cadence" }));
      fireEvent.mouseDown(getSelect("Mode"));
      fireEvent.click(await screen.findByRole("option", { name: "Time interval" }));
      fireEvent.change(screen.getByLabelText("Days between scans"), { target: { value: "14" } });

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(mockedService.updateRepositoryConnectionTriggerSettings).toHaveBeenCalledWith(
          "1",
          2,
          3,
          { triggerMode: "TIME_INTERVAL", intervalDays: 14 },
          TOKEN,
        ),
      );
    });

    it("shows the API error and keeps the dialog open when saving fails", async () => {
      mockedService.updateRepositoryConnectionTriggerSettings.mockRejectedValue(new Error("x"));
      mockedService.getRepositoryConnectionErrorMessage.mockReturnValue("pushCountThreshold is required");
      renderCard({ connection: githubConnection });
      fireEvent.click(screen.getByRole("button", { name: "Edit cadence" }));

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("pushCountThreshold is required")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();
    });

    it("closes without calling the API on Cancel", async () => {
      renderCard({ connection: githubConnection });
      fireEvent.click(screen.getByRole("button", { name: "Edit cadence" }));

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockedService.updateRepositoryConnectionTriggerSettings).not.toHaveBeenCalled();
    });
  });
});
