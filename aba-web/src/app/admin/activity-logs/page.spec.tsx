import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import AdminActivityLogsPage from "./page";
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
    eventType: "NOTIFICATION_SENT",
    actorUserId: null,
    companyId: 1,
    environmentId: 2,
    serviceId: 3,
    servicePackageId: null,
    timestamp: "2026-01-01T08:00:00.000Z",
    metadata: { packageCount: 2 },
  },
  {
    id: 2,
    eventType: "PACKAGE_MUTED",
    actorUserId: 5,
    companyId: 1,
    environmentId: 2,
    serviceId: 3,
    servicePackageId: 10,
    timestamp: "2026-01-02T09:00:00.000Z",
    metadata: null,
  },
];

function setupMocks() {
  (useSession as jest.Mock).mockReturnValue(mockSession);
  (adminService.getActivityLogs as jest.Mock).mockResolvedValue({
    data: mockRows,
    total: 2,
  });
}

describe("AdminActivityLogsPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the page heading", () => {
    setupMocks();
    render(<AdminActivityLogsPage />);
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
  });

  it("renders log rows with their event type", async () => {
    setupMocks();
    render(<AdminActivityLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("NOTIFICATION_SENT")).toBeInTheDocument();
      expect(screen.getByText("PACKAGE_MUTED")).toBeInTheDocument();
    });
  });

  it("shows 'system' for entries with no actor", async () => {
    setupMocks();
    render(<AdminActivityLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("system")).toBeInTheDocument();
    });
  });

  it("shows the actor id for entries with an actor", async () => {
    setupMocks();
    render(<AdminActivityLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("calls getActivityLogs with the default filter", async () => {
    setupMocks();
    render(<AdminActivityLogsPage />);

    await waitFor(() => {
      expect(adminService.getActivityLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
        "test-token",
      );
    });
  });

  it("shows an error alert when the fetch fails", async () => {
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (adminService.getActivityLogs as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<AdminActivityLogsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load activity logs/i)).toBeInTheDocument();
    });
  });

  it("does not fetch when there is no access token", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { tokens: { accessToken: "" } } },
    });

    render(<AdminActivityLogsPage />);

    expect(adminService.getActivityLogs).not.toHaveBeenCalled();
  });
});
