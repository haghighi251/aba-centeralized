import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import AdminVulnerabilitiesPage from "./page";
import * as adminService from "@/contexts/admin/services/adminService";

jest.mock("next-auth/react");
jest.mock("@/contexts/admin/services/adminService");

const mockSession = {
  data: {
    user: {
      tokens: { accessToken: "test-token" },
      role: "SUPER_ADMIN",
    },
  },
};

const mockRows = [
  {
    id: 1,
    username: "acme",
    email: "acme@example.com",
    status: "ACTIVE",
    createdAt: "2024-01-01T00:00:00.000Z",
    vulnerablePackageCount: 3,
    affectedServiceCount: 2,
    notificationCount: 5,
    hasPrimaryOwner: true,
  },
  {
    id: 2,
    username: "beta",
    email: "beta@example.com",
    status: "PENDING",
    createdAt: "2024-02-01T00:00:00.000Z",
    vulnerablePackageCount: 0,
    affectedServiceCount: 0,
    notificationCount: 0,
    hasPrimaryOwner: false,
  },
];

function setupMocks() {
  (useSession as jest.Mock).mockReturnValue(mockSession);
  (adminService.getCompaniesWithVulnerabilities as jest.Mock).mockResolvedValue({
    data: mockRows,
    total: 2,
  });
}

describe("AdminVulnerabilitiesPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the page heading", () => {
    setupMocks();
    render(<AdminVulnerabilitiesPage />);
    expect(screen.getByText("Companies with Vulnerabilities")).toBeInTheDocument();
  });

  it("renders company rows with their vulnerability counts", async () => {
    setupMocks();
    render(<AdminVulnerabilitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("acme")).toBeInTheDocument();
      expect(screen.getByText("beta")).toBeInTheDocument();
    });
  });

  it("shows a 'Missing' chip for companies without a primary owner", async () => {
    setupMocks();
    render(<AdminVulnerabilitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Missing")).toBeInTheDocument();
    });
  });

  it("shows a 'Set' chip for companies with a primary owner", async () => {
    setupMocks();
    render(<AdminVulnerabilitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Set")).toBeInTheDocument();
    });
  });

  it("calls getCompaniesWithVulnerabilities with the default filter", async () => {
    setupMocks();
    render(<AdminVulnerabilitiesPage />);

    await waitFor(() => {
      expect(adminService.getCompaniesWithVulnerabilities).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
        "test-token",
      );
    });
  });

  it("shows an error alert when the fetch fails", async () => {
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (adminService.getCompaniesWithVulnerabilities as jest.Mock).mockRejectedValue(
      new Error("Network error"),
    );

    render(<AdminVulnerabilitiesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load companies/i)).toBeInTheDocument();
    });
  });

  it("does not fetch when there is no access token", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { tokens: { accessToken: "" } } },
    });

    render(<AdminVulnerabilitiesPage />);

    expect(adminService.getCompaniesWithVulnerabilities).not.toHaveBeenCalled();
  });
});
