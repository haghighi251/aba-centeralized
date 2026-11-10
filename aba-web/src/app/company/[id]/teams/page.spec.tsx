import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import TeamsPage from "./page";
import * as teamService from "@/contexts/team/services/teamService";

jest.mock("next-auth/react");
jest.mock("next/navigation");
jest.mock("@/contexts/team/services/teamService");

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

/** MUI Select doesn't wire up label `for`/`id` for getByLabelText — find the combobox via its FormControl. */
function getSelect(labelText: string) {
  const label = screen.getByText(labelText, { selector: "label" });
  const formControl = label.closest(".MuiFormControl-root") as HTMLElement;
  return within(formControl).getByRole("combobox");
}

function setupMocks(overrides: { session?: typeof mockOwnerSession } = {}) {
  (useSession as jest.Mock).mockReturnValue(overrides.session ?? mockOwnerSession);
  (useParams as jest.Mock).mockReturnValue({ id: "1" });
  (teamService.getTeams as jest.Mock).mockResolvedValue({ data: mockTeams, total: 2 });
  (teamService.getTeamErrorMessage as jest.Mock).mockImplementation(
    (_e: unknown, fallback: string) => fallback,
  );
}

describe("TeamsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("renders the page heading", async () => {
    setupMocks();
    render(<TeamsPage />);
    expect(screen.getByText("Teams")).toBeInTheDocument();
    await waitFor(() => screen.getByText("Platform"));
  });

  it("loads teams on mount and renders them in the table", async () => {
    setupMocks();
    render(<TeamsPage />);

    await waitFor(() => {
      expect(screen.getByText("Platform")).toBeInTheDocument();
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });
    expect(teamService.getTeams).toHaveBeenCalledWith("1", {}, "test-token");
  });

  it("shows the Add Team button for BUSINESS_OWNER", async () => {
    setupMocks();
    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));
    expect(screen.getByRole("button", { name: /Add Team/i })).toBeInTheDocument();
  });

  it("hides the Add Team button and Actions column for BUSINESS_MEMBER", async () => {
    setupMocks({ session: mockMemberSession });
    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));
    expect(screen.queryByRole("button", { name: /Add Team/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no teams", async () => {
    setupMocks();
    (teamService.getTeams as jest.Mock).mockResolvedValue({ data: [], total: 0 });
    render(<TeamsPage />);

    await waitFor(() => {
      expect(screen.getByText("No teams found.")).toBeInTheDocument();
    });
  });

  it("shows an error alert when loading fails", async () => {
    setupMocks();
    (teamService.getTeams as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<TeamsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load teams.")).toBeInTheDocument();
    });
  });

  it("does not call getTeams when there is no access token", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { tokens: { accessToken: "" }, role: "BUSINESS_OWNER" } },
    });
    (useParams as jest.Mock).mockReturnValue({ id: "1" });

    render(<TeamsPage />);

    expect(teamService.getTeams).not.toHaveBeenCalled();
  });

  it("re-fetches with the search term when the search field changes", async () => {
    setupMocks();
    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "platform" } });

    await waitFor(() => {
      expect(teamService.getTeams).toHaveBeenLastCalledWith(
        "1",
        { search: "platform" },
        "test-token",
      );
    });
  });

  it("re-fetches with the status filter when changed", async () => {
    setupMocks();
    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    fireEvent.mouseDown(getSelect("Status"));
    fireEvent.click(await screen.findByRole("option", { name: "ARCHIVED" }));

    await waitFor(() => {
      expect(teamService.getTeams).toHaveBeenLastCalledWith(
        "1",
        { status: "ARCHIVED" },
        "test-token",
      );
    });
  });

  it("creates a new team via the Add Team dialog", async () => {
    setupMocks();
    const created: teamService.Team = {
      id: 3,
      name: "Security",
      slug: "security",
      description: null,
      status: "ACTIVE",
      companyId: 1,
      createdAt: "2024-03-01T00:00:00.000Z",
      updatedAt: "2024-03-01T00:00:00.000Z",
    };
    (teamService.createTeam as jest.Mock).mockResolvedValue(created);

    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    fireEvent.click(screen.getByRole("button", { name: /Add Team/i }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Security" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Team$/i }));

    await waitFor(() => {
      expect(teamService.createTeam).toHaveBeenCalledWith(
        "1",
        { name: "Security", description: null },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("Security")).toBeInTheDocument());
  });

  it("disables the save button when the name is empty", async () => {
    setupMocks();
    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    fireEvent.click(screen.getByRole("button", { name: /Add Team/i }));

    const saveButton = screen.getByRole("button", { name: /^Add Team$/i });
    expect(saveButton).toBeDisabled();
  });

  it("edits an existing team via the Edit dialog", async () => {
    setupMocks();
    const updated = { ...mockTeams[0], name: "Platform Team", status: "ARCHIVED" as const };
    (teamService.updateTeam as jest.Mock).mockResolvedValue(updated);

    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    const editButtons = screen.getAllByTestId("EditIcon");
    fireEvent.click(editButtons[0].closest("button")!);

    expect(screen.getByDisplayValue("Platform")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Platform Team" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(teamService.updateTeam).toHaveBeenCalledWith(
        "1",
        1,
        { name: "Platform Team", description: "Core platform team", status: "ACTIVE" },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("Platform Team")).toBeInTheDocument());
  });

  it("deletes a team after confirmation", async () => {
    setupMocks();
    (teamService.deleteTeam as jest.Mock).mockResolvedValue(undefined);

    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    fireEvent.click(deleteButtons[0].closest("button")!);

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete team "Platform"? This will also delete all of its environments.',
    );
    await waitFor(() => {
      expect(teamService.deleteTeam).toHaveBeenCalledWith("1", 1, "test-token");
    });
    await waitFor(() => expect(screen.queryByText("Platform")).not.toBeInTheDocument());
  });

  it("does not delete a team when the confirmation is cancelled", async () => {
    setupMocks();
    window.confirm = jest.fn(() => false);

    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    fireEvent.click(deleteButtons[0].closest("button")!);

    expect(teamService.deleteTeam).not.toHaveBeenCalled();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("shows an error alert when delete fails", async () => {
    setupMocks();
    (teamService.deleteTeam as jest.Mock).mockRejectedValue(new Error("Forbidden"));

    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    fireEvent.click(deleteButtons[0].closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to delete team.")).toBeInTheDocument();
    });
  });

  it("shows a form error when create fails", async () => {
    setupMocks();
    (teamService.createTeam as jest.Mock).mockRejectedValue(new Error("Conflict"));

    render(<TeamsPage />);
    await waitFor(() => screen.getByText("Platform"));

    fireEvent.click(screen.getByRole("button", { name: /Add Team/i }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Security" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Team$/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create team.")).toBeInTheDocument();
    });
  });
});
