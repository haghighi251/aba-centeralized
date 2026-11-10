import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import UsersPage from "./page";
import * as companyDashboardService from "@/contexts/company/services/companyDashboardService";
import * as teamService from "@/contexts/team/services/teamService";

jest.mock("next-auth/react");
jest.mock("next/navigation");
jest.mock("@/contexts/company/services/companyDashboardService");
jest.mock("@/contexts/team/services/teamService");

const mockOwnerSession = {
  data: {
    user: { id: "10", tokens: { accessToken: "test-token" }, role: "BUSINESS_OWNER" },
  },
};

const mockAdminSession = {
  data: {
    user: { id: "20", tokens: { accessToken: "test-token" }, role: "BUSINESS_ADMIN" },
  },
};

const mockMemberSession = {
  data: {
    user: { id: "30", tokens: { accessToken: "test-token" }, role: "BUSINESS_MEMBER" },
  },
};

const mockUsers: companyDashboardService.CompanyUser[] = [
  {
    id: 10,
    email: "owner@example.com",
    firstName: "Olivia",
    lastName: "Owner",
    role: "BUSINESS_OWNER",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    teams: [],
  },
  {
    id: 20,
    email: "admin@example.com",
    firstName: "Alan",
    lastName: "Admin",
    role: "BUSINESS_ADMIN",
    status: "ACTIVE",
    createdAt: "2024-01-02T00:00:00.000Z",
    teams: [{ id: 1, name: "Platform" }],
  },
  {
    id: 30,
    email: "member@example.com",
    firstName: "Mia",
    lastName: "Member",
    role: "BUSINESS_MEMBER",
    status: "ACTIVE",
    createdAt: "2024-01-03T00:00:00.000Z",
    teams: [],
  },
];

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

/** MUI Select doesn't wire up label `for`/`id` for getByLabelText — find the combobox via its FormControl. */
function getSelect(labelText: string) {
  const label = screen.getByText(labelText, { selector: "label" });
  const formControl = label.closest(".MuiFormControl-root") as HTMLElement;
  return within(formControl).getByRole("combobox");
}

function setupMocks(overrides: { session?: typeof mockOwnerSession } = {}) {
  (useSession as jest.Mock).mockReturnValue(overrides.session ?? mockOwnerSession);
  (useParams as jest.Mock).mockReturnValue({ id: "1" });
  (companyDashboardService.getCompanyUsers as jest.Mock).mockResolvedValue(mockUsers);
  (teamService.getTeams as jest.Mock).mockResolvedValue({ data: mockTeams, total: 2 });
}

describe("UsersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("renders the page heading and loads users into the table", async () => {
    setupMocks();
    render(<UsersPage />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("owner@example.com")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("member@example.com")).toBeInTheDocument();
    });
  });

  it("shows each user's linked teams", async () => {
    setupMocks();
    render(<UsersPage />);
    await waitFor(() => screen.getByText("admin@example.com"));
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("shows the Add User button and Actions column for BUSINESS_OWNER", async () => {
    setupMocks();
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));
    expect(screen.getByRole("button", { name: /Add User/i })).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("shows the Add User button and Actions column for BUSINESS_ADMIN", async () => {
    setupMocks({ session: mockAdminSession });
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));
    expect(screen.getByRole("button", { name: /Add User/i })).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("hides the Add User button and Actions column for BUSINESS_MEMBER", async () => {
    setupMocks({ session: mockMemberSession });
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));
    expect(screen.queryByRole("button", { name: /Add User/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    expect(screen.queryByTestId("EditIcon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("DeleteIcon")).not.toBeInTheDocument();
  });

  it("lets the owner caller edit the owner row, but locks the role field and omits it from the save payload", async () => {
    setupMocks();
    const updated: companyDashboardService.CompanyUser = {
      ...mockUsers[0],
      firstName: "Olivia Updated",
    };
    (companyDashboardService.updateCompanyUser as jest.Mock).mockResolvedValue(updated);

    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));

    // Owner caller can edit all three rows, including their own owner row.
    expect(screen.getAllByTestId("EditIcon")).toHaveLength(3);

    const ownerRow = screen.getByText("owner@example.com").closest("tr")!;
    fireEvent.click(within(ownerRow).getByTestId("EditIcon").closest("button")!);

    // Role is shown as a locked, non-interactive field for an owner target.
    expect(screen.getByLabelText("Role")).toBeDisabled();
    expect(screen.getByDisplayValue("Owner")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(companyDashboardService.updateCompanyUser).toHaveBeenCalledWith(
        "1",
        10,
        { teamIds: [] },
        "test-token",
      );
    });
  });

  it("only lets BUSINESS_ADMIN edit/delete BUSINESS_MEMBER rows, not owner/admin rows", async () => {
    setupMocks({ session: mockAdminSession });
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));

    // Only the BUSINESS_MEMBER row (Mia Member) is editable/deletable by an admin.
    expect(screen.getAllByTestId("EditIcon")).toHaveLength(1);
    expect(screen.getAllByTestId("DeleteIcon")).toHaveLength(1);
  });

  it("does not offer the Admin role option when adding a user as BUSINESS_ADMIN", async () => {
    setupMocks({ session: mockAdminSession });
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));

    fireEvent.click(screen.getByRole("button", { name: /Add User/i }));
    fireEvent.mouseDown(getSelect("Role *"));
    expect(screen.queryByRole("option", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Member" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  });

  it("creates a new user with selected teams via the Add User dialog", async () => {
    setupMocks();
    const created: companyDashboardService.CompanyUser = {
      id: 40,
      email: "new.user@example.com",
      firstName: null,
      lastName: null,
      role: "BUSINESS_MEMBER",
      status: "ACTIVE",
      createdAt: "2024-02-01T00:00:00.000Z",
      teams: [{ id: 1, name: "Platform" }],
    };
    (companyDashboardService.addCompanyUser as jest.Mock).mockResolvedValue(created);

    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));

    fireEvent.click(screen.getByRole("button", { name: /Add User/i }));
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "new.user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Initial Password/), {
      target: { value: "StrongPass123" },
    });
    fireEvent.mouseDown(getSelect("Teams"));
    fireEvent.click(await screen.findByRole("option", { name: "Platform" }));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /^Add User$/i }));

    await waitFor(() => {
      expect(companyDashboardService.addCompanyUser).toHaveBeenCalledWith(
        "1",
        {
          email: "new.user@example.com",
          firstName: undefined,
          lastName: undefined,
          role: "BUSINESS_MEMBER",
          password: "StrongPass123",
          teamIds: [1],
        },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("new.user@example.com")).toBeInTheDocument());
  }, 20000);

  it("disables the Add User submit button until email and password are filled", async () => {
    setupMocks();
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));

    fireEvent.click(screen.getByRole("button", { name: /Add User/i }));
    expect(screen.getByRole("button", { name: /^Add User$/i })).toBeDisabled();
  });

  it("edits a user's role and teams via the Edit dialog", async () => {
    setupMocks();
    const updated: companyDashboardService.CompanyUser = {
      ...mockUsers[2],
      teams: [{ id: 2, name: "Growth" }],
    };
    (companyDashboardService.updateCompanyUser as jest.Mock).mockResolvedValue(updated);

    render(<UsersPage />);
    await waitFor(() => screen.getByText("member@example.com"));

    const editButtons = screen.getAllByTestId("EditIcon");
    fireEvent.click(editButtons[editButtons.length - 1].closest("button")!);

    expect(screen.getByDisplayValue("member@example.com")).toBeInTheDocument();

    fireEvent.mouseDown(getSelect("Teams"));
    fireEvent.click(await screen.findByRole("option", { name: "Growth" }));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(companyDashboardService.updateCompanyUser).toHaveBeenCalledWith(
        "1",
        30,
        { role: "BUSINESS_MEMBER", teamIds: [2] },
        "test-token",
      );
    });
  });

  it("deletes a user after confirmation", async () => {
    setupMocks();
    (companyDashboardService.removeCompanyUser as jest.Mock).mockResolvedValue(undefined);

    render(<UsersPage />);
    await waitFor(() => screen.getByText("member@example.com"));

    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    fireEvent.click(deleteButtons[deleteButtons.length - 1].closest("button")!);

    expect(window.confirm).toHaveBeenCalledWith("Remove this user from the company?");
    await waitFor(() => {
      expect(companyDashboardService.removeCompanyUser).toHaveBeenCalledWith("1", 30, "test-token");
    });
    await waitFor(() =>
      expect(screen.queryByText("member@example.com")).not.toBeInTheDocument(),
    );
  });

  it("does not delete a user when the confirmation is cancelled", async () => {
    setupMocks();
    window.confirm = jest.fn(() => false);

    render(<UsersPage />);
    await waitFor(() => screen.getByText("member@example.com"));

    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    fireEvent.click(deleteButtons[deleteButtons.length - 1].closest("button")!);

    expect(companyDashboardService.removeCompanyUser).not.toHaveBeenCalled();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    setupMocks();
    (companyDashboardService.getCompanyUsers as jest.Mock).mockResolvedValue([]);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });
  });

  it("shows an error alert when loading fails", async () => {
    setupMocks();
    (companyDashboardService.getCompanyUsers as jest.Mock).mockRejectedValue(
      new Error("Network error"),
    );

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load users.")).toBeInTheDocument();
    });
  });

  it("does not fetch the team list for BUSINESS_MEMBER viewers", async () => {
    setupMocks({ session: mockMemberSession });
    render(<UsersPage />);
    await waitFor(() => screen.getByText("owner@example.com"));

    expect(teamService.getTeams).not.toHaveBeenCalled();
  });
});
