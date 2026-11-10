import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import EnvironmentsPage from "./page";
import * as environmentService from "@/contexts/environment/services/environmentService";
import * as teamService from "@/contexts/team/services/teamService";

jest.mock("next-auth/react");
jest.mock("next/navigation");
jest.mock("@/contexts/environment/services/environmentService");
jest.mock("@/contexts/team/services/teamService");

jest.setTimeout(15000);

const mockOwnerSession = {
  data: {
    user: {
      tokens: { accessToken: "test-token" },
      role: "BUSINESS_OWNER",
    },
  },
};

const mockMemberSession = {
  data: {
    user: {
      tokens: { accessToken: "test-token" },
      role: "BUSINESS_MEMBER",
    },
  },
};

const mockTeams: teamService.Team[] = [
  {
    id: 1,
    name: "Platform",
    slug: "platform",
    description: null,
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
    status: "ACTIVE",
    companyId: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

const mockEnvironments: environmentService.Environment[] = [
  {
    id: 1,
    name: "Production",
    slug: "production",
    type: "PRODUCTION",
    isProduction: true,
    order: 4,
    description: "Main production environment",
    status: "ACTIVE",
    companyId: 1,
    teamId: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Staging",
    slug: "staging",
    type: "STAGING",
    isProduction: false,
    order: 3,
    description: null,
    status: "ACTIVE",
    companyId: 1,
    teamId: 2,
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  },
];

/** Finds the table row containing the given environment slug (slugs are unique, unlike names/chips). */
function getRowBySlug(slug: string) {
  return screen.getByText(slug).closest("tr")!;
}

/** MUI Select doesn't wire up label `for`/`id` for getByLabelText — find the combobox via its FormControl. */
function getSelect(labelText: string) {
  const label = screen.getByText(labelText, { selector: "label" });
  const formControl = label.closest(".MuiFormControl-root") as HTMLElement;
  return within(formControl).getByRole("combobox");
}

function setupMocks(
  overrides: { session?: typeof mockOwnerSession; teams?: teamService.Team[] } = {},
) {
  (useSession as jest.Mock).mockReturnValue(overrides.session ?? mockOwnerSession);
  (useParams as jest.Mock).mockReturnValue({ id: "1" });
  (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  (environmentService.getEnvironments as jest.Mock).mockResolvedValue({
    data: mockEnvironments,
    total: 2,
  });
  (teamService.getTeams as jest.Mock).mockResolvedValue({
    data: overrides.teams ?? mockTeams,
    total: (overrides.teams ?? mockTeams).length,
  });
  (environmentService.getEnvironmentErrorMessage as jest.Mock).mockImplementation(
    (_e: unknown, fallback: string) => fallback,
  );
}

describe("EnvironmentsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("renders the page heading", async () => {
    setupMocks();
    render(<EnvironmentsPage />);
    expect(screen.getByText("Environments")).toBeInTheDocument();
    await waitFor(() => screen.getByText("production"));
  });

  it("loads environments and teams on mount and renders them in the table", async () => {
    setupMocks();
    render(<EnvironmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("production")).toBeInTheDocument();
      expect(screen.getByText("staging")).toBeInTheDocument();
    });
    const productionRow = getRowBySlug("production");
    expect(within(productionRow).getAllByText("Production")[0]).toBeInTheDocument();
    expect(environmentService.getEnvironments).toHaveBeenCalledWith("1", {}, "test-token");
    expect(teamService.getTeams).toHaveBeenCalledWith("1", {}, "test-token");
  });

  it("shows the team name for each environment in the table", async () => {
    setupMocks();
    render(<EnvironmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("production")).toBeInTheDocument();
    });

    const productionRow = getRowBySlug("production");
    expect(within(productionRow).getByText("Platform")).toBeInTheDocument();

    const stagingRow = getRowBySlug("staging");
    expect(within(stagingRow).getByText("Growth")).toBeInTheDocument();
  });

  it("shows the Add Environment button for BUSINESS_OWNER", async () => {
    setupMocks();
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));
    expect(screen.getByRole("button", { name: /Add Environment/i })).toBeInTheDocument();
  });

  it("hides the Add Environment button and edit/delete actions for BUSINESS_MEMBER", async () => {
    setupMocks({ session: mockMemberSession });
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));
    expect(screen.queryByRole("button", { name: /Add Environment/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("EditIcon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("DeleteIcon")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("VisibilityIcon").length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no environments", async () => {
    setupMocks();
    (environmentService.getEnvironments as jest.Mock).mockResolvedValue({ data: [], total: 0 });
    render(<EnvironmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No environments found.")).toBeInTheDocument();
    });
  });

  it("shows an error alert when loading fails", async () => {
    setupMocks();
    (environmentService.getEnvironments as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<EnvironmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load environments.")).toBeInTheDocument();
    });
  });

  it("does not call getEnvironments when there is no access token", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { tokens: { accessToken: "" }, role: "BUSINESS_OWNER" } },
    });
    (useParams as jest.Mock).mockReturnValue({ id: "1" });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });

    render(<EnvironmentsPage />);

    expect(environmentService.getEnvironments).not.toHaveBeenCalled();
  });

  it("re-fetches with the teamId filter when the Team filter changes", async () => {
    setupMocks();
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.mouseDown(getSelect("Team"));
    fireEvent.click(await screen.findByRole("option", { name: "Growth" }));

    await waitFor(() => {
      expect(environmentService.getEnvironments).toHaveBeenLastCalledWith(
        "1",
        { teamId: 2 },
        "test-token",
      );
    });
  });

  it("re-fetches with the type filter when changed", async () => {
    setupMocks();
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.mouseDown(getSelect("Type"));
    fireEvent.click(await screen.findByRole("option", { name: "Staging" }));

    await waitFor(() => {
      expect(environmentService.getEnvironments).toHaveBeenLastCalledWith(
        "1",
        { type: "STAGING" },
        "test-token",
      );
    });
  });

  it("re-fetches with the status filter when changed", async () => {
    setupMocks();
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.mouseDown(getSelect("Status"));
    fireEvent.click(await screen.findByRole("option", { name: "ARCHIVED" }));

    await waitFor(() => {
      expect(environmentService.getEnvironments).toHaveBeenLastCalledWith(
        "1",
        { status: "ARCHIVED" },
        "test-token",
      );
    });
  });

  it("shows a warning and disables saving when there are no teams", async () => {
    setupMocks({ teams: [] });
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.click(screen.getByRole("button", { name: /Add Environment/i }));

    expect(
      screen.getByText("You need to create a team before you can add an environment."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Add Environment$/i })).toBeDisabled();
  });

  it("creates a new environment via the Add Environment dialog", async () => {
    setupMocks();
    const created: environmentService.Environment = {
      id: 3,
      name: "QA",
      slug: "qa",
      type: "TESTING",
      isProduction: false,
      order: 2,
      description: null,
      status: "ACTIVE",
      companyId: 1,
      teamId: 2,
      createdAt: "2024-03-01T00:00:00.000Z",
      updatedAt: "2024-03-01T00:00:00.000Z",
    };
    (environmentService.createEnvironment as jest.Mock).mockResolvedValue(created);

    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.click(screen.getByRole("button", { name: /Add Environment/i }));

    fireEvent.mouseDown(getSelect("Team *"));
    fireEvent.click(await screen.findByRole("option", { name: "Growth" }));

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "QA" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Environment$/i }));

    await waitFor(() => {
      expect(environmentService.createEnvironment).toHaveBeenCalledWith(
        "1",
        {
          teamId: 2,
          name: "QA",
          type: "CUSTOM",
          isProduction: false,
          order: undefined,
          description: null,
        },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("QA")).toBeInTheDocument());
  });

  it("disables the save button when no team is selected", async () => {
    setupMocks();
    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.click(screen.getByRole("button", { name: /Add Environment/i }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "QA" } });

    expect(screen.getByRole("button", { name: /^Add Environment$/i })).toBeDisabled();
  });

  it("edits an existing environment, including reassigning its team", async () => {
    setupMocks();
    const updated = { ...mockEnvironments[0], teamId: 2, name: "Prod EU" };
    (environmentService.updateEnvironment as jest.Mock).mockResolvedValue(updated);

    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    const editButtons = screen.getAllByTestId("EditIcon");
    fireEvent.click(editButtons[0].closest("button")!);

    expect(screen.getByDisplayValue("Production")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Prod EU" } });
    fireEvent.mouseDown(getSelect("Team *"));
    fireEvent.click(await screen.findByRole("option", { name: "Growth" }));

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(environmentService.updateEnvironment).toHaveBeenCalledWith(
        "1",
        1,
        {
          teamId: 2,
          name: "Prod EU",
          type: "PRODUCTION",
          isProduction: true,
          order: 4,
          description: "Main production environment",
          status: "ACTIVE",
        },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("Prod EU")).toBeInTheDocument());
  });

  it("deletes an environment after confirmation", async () => {
    setupMocks();
    (environmentService.deleteEnvironment as jest.Mock).mockResolvedValue(undefined);

    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    const productionRow = getRowBySlug("production");
    fireEvent.click(within(productionRow).getByTestId("DeleteIcon").closest("button")!);

    expect(window.confirm).toHaveBeenCalledWith('Delete environment "Production"?');
    await waitFor(() => {
      expect(environmentService.deleteEnvironment).toHaveBeenCalledWith("1", 1, "test-token");
    });
    await waitFor(() => expect(screen.queryByText("production")).not.toBeInTheDocument());
  });

  it("does not delete an environment when the confirmation is cancelled", async () => {
    setupMocks();
    window.confirm = jest.fn(() => false);

    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    const productionRow = getRowBySlug("production");
    fireEvent.click(within(productionRow).getByTestId("DeleteIcon").closest("button")!);

    expect(environmentService.deleteEnvironment).not.toHaveBeenCalled();
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("shows a form error when create fails", async () => {
    setupMocks();
    (environmentService.createEnvironment as jest.Mock).mockRejectedValue(new Error("Conflict"));

    render(<EnvironmentsPage />);
    await waitFor(() => screen.getByText("production"));

    fireEvent.click(screen.getByRole("button", { name: /Add Environment/i }));
    fireEvent.mouseDown(getSelect("Team *"));
    fireEvent.click(await screen.findByRole("option", { name: "Platform" }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "QA" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Environment$/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create environment.")).toBeInTheDocument();
    });
  });
});
