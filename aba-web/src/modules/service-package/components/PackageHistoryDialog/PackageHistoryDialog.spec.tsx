import React from "react";
import { render, screen } from "@testing-library/react";
import PackageHistoryDialog from "./PackageHistoryDialog";
import * as useServicePackageHistoryModule from "@/modules/service-package/hooks/useServicePackageHistory";

jest.mock("@/modules/service-package/hooks/useServicePackageHistory");

const mockUseHistory = useServicePackageHistoryModule.useServicePackageHistory as jest.Mock;

const mockHistoryItem = {
  id: 9,
  status: "STALE",
  versionRange: null,
  introducedAt: "2024-01-01T00:00:00.000Z",
  deactivatedAt: "2024-06-01T00:00:00.000Z",
  alarmCount: 0,
  lastAlarmAt: null,
  serviceId: 3,
  packageId: 2,
  package: {
    id: 2,
    ecosystem: "NPM",
    name: "express",
    version: "4.17.0",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

const defaultProps = {
  open: true,
  companyId: "1",
  environmentId: 2,
  serviceId: 3,
  accessToken: "token",
  onClose: jest.fn(),
};

describe("PackageHistoryDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the dialog title", () => {
    mockUseHistory.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false, error: null });
    render(<PackageHistoryDialog {...defaultProps} />);
    expect(screen.getByText("Package History")).toBeInTheDocument();
  });

  it("shows a spinner while loading", () => {
    mockUseHistory.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<PackageHistoryDialog {...defaultProps} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows empty state when no history items", () => {
    mockUseHistory.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false, error: null });
    render(<PackageHistoryDialog {...defaultProps} />);
    expect(screen.getByText("No history found.")).toBeInTheDocument();
  });

  it("renders history rows when data is available", () => {
    mockUseHistory.mockReturnValue({
      data: { data: [mockHistoryItem], total: 1 },
      isLoading: false,
      error: null,
    });
    render(<PackageHistoryDialog {...defaultProps} />);
    expect(screen.getByText("express")).toBeInTheDocument();
    expect(screen.getByText("4.17.0")).toBeInTheDocument();
    expect(screen.getByText("Stale")).toBeInTheDocument();
  });

  it("shows an error alert when the fetch fails", () => {
    mockUseHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    });
    render(<PackageHistoryDialog {...defaultProps} />);
    expect(screen.getByText("Failed to load package history.")).toBeInTheDocument();
  });

  it("passes enabled=open to the hook so it only fetches when the dialog is open", () => {
    mockUseHistory.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<PackageHistoryDialog {...defaultProps} open={false} />);
    expect(mockUseHistory).toHaveBeenCalledWith(
      "1",
      2,
      3,
      expect.any(Object),
      "token",
      false,
    );
  });
});
