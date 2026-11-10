import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import PackagesPage from "./PackagesPage";
import * as useServicePackagesModule from "@/modules/service-package/hooks/useServicePackages";
import * as servicePackageService from "@/modules/service-package/services/servicePackageService";

jest.mock("next-auth/react");
jest.mock("next/navigation");
jest.mock("@/modules/service-package/hooks/useServicePackages");
jest.mock("@/modules/service-package/services/servicePackageService");
jest.mock("@/components/ReactQueryProvider/ReactQueryProvider", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock(
  "@/modules/service-package/components/PackagesTable/PackagesTable",
  () =>
    function MockPackagesTable({
      packages,
      loading,
      canManage,
      onEdit,
      onDelete,
      onNotificationPreference,
    }: {
      packages: { id: number; package: { name: string } }[];
      loading: boolean;
      canManage: boolean;
      onEdit: (p: unknown) => void;
      onDelete: (p: unknown) => void;
      onNotificationPreference: (p: unknown) => void;
    }) {
      return (
        <div data-testid="packages-table">
          {loading && <span>loading</span>}
          {canManage && <span>can-manage</span>}
          {packages.map((p) => (
            <div key={p.id}>
              <span>{p.package.name}</span>
              <button onClick={() => onEdit(p)}>edit-{p.id}</button>
              <button onClick={() => onDelete(p)}>delete-{p.id}</button>
              <button onClick={() => onNotificationPreference(p)}>notification-{p.id}</button>
            </div>
          ))}
        </div>
      );
    },
);
jest.mock(
  "@/modules/service-package/components/NotificationPreferenceDialog/NotificationPreferenceDialog",
  () =>
    function MockNotificationDialog({
      pkg,
      onClose,
      onSubmit,
    }: {
      pkg: { id: number } | null;
      onClose: () => void;
      onSubmit: (p: unknown) => void;
    }) {
      if (!pkg) return null;
      return (
        <div data-testid="notification-dialog">
          <span>notification-target-{pkg.id}</span>
          <button onClick={onClose}>close-notification</button>
          <button onClick={() => onSubmit({ action: "MUTE" })}>submit-mute</button>
        </div>
      );
    },
);
jest.mock(
  "@/modules/service-package/components/PackageFormDialog/PackageFormDialog",
  () =>
    function MockFormDialog({
      open,
      onClose,
      onSave,
      editing,
    }: {
      open: boolean;
      onClose: () => void;
      onSave: (p: unknown) => void;
      editing: { id: number } | null;
    }) {
      if (!open) return null;
      return (
        <div data-testid="form-dialog">
          <span>{editing ? `editing-${editing.id}` : "creating"}</span>
          <button onClick={onClose}>close-form</button>
          <button onClick={() => onSave({ name: "test", version: "1.0.0" })}>
            submit-form
          </button>
        </div>
      );
    },
);
jest.mock(
  "@/modules/service-package/components/PackageHistoryDialog/PackageHistoryDialog",
  () =>
    function MockHistoryDialog({
      open,
      onClose,
    }: {
      open: boolean;
      onClose: () => void;
    }) {
      if (!open) return null;
      return (
        <div data-testid="history-dialog">
          <button onClick={onClose}>close-history</button>
        </div>
      );
    },
);
jest.mock(
  "@/modules/service-package/components/BulkImportDialog/BulkImportDialog",
  () =>
    function MockBulkDialog({
      open,
      onClose,
      onImport,
    }: {
      open: boolean;
      onClose: () => void;
      onImport: (p: unknown[], eco: string) => void;
    }) {
      if (!open) return null;
      return (
        <div data-testid="bulk-dialog">
          <button onClick={onClose}>close-bulk</button>
          <button onClick={() => onImport([{ name: "pkg", version: "1.0.0" }], "NPM")}>
            trigger-import
          </button>
        </div>
      );
    },
);

const mockUseServicePackages = useServicePackagesModule.useServicePackages as jest.Mock;
const mockRouterPush = jest.fn();

const mockPackage = {
  id: 1,
  status: "ACTIVE",
  versionRange: "^4.18.0",
  introducedAt: "2024-01-01T00:00:00.000Z",
  deactivatedAt: null,
  alarmCount: 0,
  lastAlarmAt: null,
  serviceId: 3,
  packageId: 1,
  package: { id: 1, ecosystem: "NPM", name: "express", version: "4.18.2", createdAt: "" },
  createdAt: "",
  updatedAt: "",
};

function setupMocks(overrides: { role?: string; data?: unknown } = {}) {
  (useSession as jest.Mock).mockReturnValue({
    data: {
      user: {
        tokens: { accessToken: "test-token" },
        role: overrides.role ?? "BUSINESS_OWNER",
      },
    },
  });
  (useParams as jest.Mock).mockReturnValue({ id: "1", envId: "2", serviceId: "3" });
  (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
  mockUseServicePackages.mockReturnValue({
    data: overrides.data ?? { data: [mockPackage], total: 1 },
    isLoading: false,
    error: null,
  });
}

describe("PackagesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("renders the page heading", () => {
    setupMocks();
    render(<PackagesPage />);
    expect(screen.getByText("Packages")).toBeInTheDocument();
  });

  it("renders the PackagesTable with fetched data", () => {
    setupMocks();
    render(<PackagesPage />);
    expect(screen.getByTestId("packages-table")).toBeInTheDocument();
    expect(screen.getByText("express")).toBeInTheDocument();
  });

  it("shows View History button for all roles", () => {
    setupMocks({ role: "BUSINESS_MEMBER" });
    render(<PackagesPage />);
    expect(screen.getByText("View History")).toBeInTheDocument();
  });

  it("shows Add Package and Upload buttons only for managers", () => {
    setupMocks({ role: "BUSINESS_OWNER" });
    render(<PackagesPage />);
    expect(screen.getByText("Add Package")).toBeInTheDocument();
    expect(screen.getByText("Upload package.json")).toBeInTheDocument();
  });

  it("hides Add Package and Upload buttons for BUSINESS_MEMBER", () => {
    setupMocks({ role: "BUSINESS_MEMBER" });
    render(<PackagesPage />);
    expect(screen.queryByText("Add Package")).not.toBeInTheDocument();
    expect(screen.queryByText("Upload package.json")).not.toBeInTheDocument();
  });

  it("passes canManage=true to PackagesTable for owners", () => {
    setupMocks({ role: "BUSINESS_OWNER" });
    render(<PackagesPage />);
    expect(screen.getByText("can-manage")).toBeInTheDocument();
  });

  it("passes canManage=false to PackagesTable for members", () => {
    setupMocks({ role: "BUSINESS_MEMBER" });
    render(<PackagesPage />);
    expect(screen.queryByText("can-manage")).not.toBeInTheDocument();
  });

  it("opens the form dialog when Add Package is clicked", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Add Package"));
    expect(screen.getByTestId("form-dialog")).toBeInTheDocument();
    expect(screen.getByText("creating")).toBeInTheDocument();
  });

  it("opens the form dialog pre-filled when edit is triggered", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("edit-1"));
    expect(screen.getByText("editing-1")).toBeInTheDocument();
  });

  it("closes the form dialog on cancel", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Add Package"));
    fireEvent.click(screen.getByText("close-form"));
    expect(screen.queryByTestId("form-dialog")).not.toBeInTheDocument();
  });

  it("calls createServicePackage on form submit (create mode)", async () => {
    (servicePackageService.createServicePackage as jest.Mock).mockResolvedValue(mockPackage);
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Add Package"));
    fireEvent.click(screen.getByText("submit-form"));
    await waitFor(() => {
      expect(servicePackageService.createServicePackage).toHaveBeenCalled();
    });
  });

  it("calls updateServicePackage on form submit (edit mode)", async () => {
    (servicePackageService.updateServicePackage as jest.Mock).mockResolvedValue(mockPackage);
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("edit-1"));
    fireEvent.click(screen.getByText("submit-form"));
    await waitFor(() => {
      expect(servicePackageService.updateServicePackage).toHaveBeenCalled();
    });
  });

  it("calls deleteServicePackage when delete is confirmed", async () => {
    (servicePackageService.deleteServicePackage as jest.Mock).mockResolvedValue(mockPackage);
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("delete-1"));
    await waitFor(() => {
      expect(servicePackageService.deleteServicePackage).toHaveBeenCalled();
    });
  });

  it("does not call deleteServicePackage when delete is cancelled", async () => {
    window.confirm = jest.fn(() => false);
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("delete-1"));
    expect(servicePackageService.deleteServicePackage).not.toHaveBeenCalled();
  });

  it("opens the history dialog when View History is clicked", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("View History"));
    expect(screen.getByTestId("history-dialog")).toBeInTheDocument();
  });

  it("closes the history dialog", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("View History"));
    fireEvent.click(screen.getByText("close-history"));
    expect(screen.queryByTestId("history-dialog")).not.toBeInTheDocument();
  });

  it("opens the bulk import dialog when Upload is clicked", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Upload package.json"));
    expect(screen.getByTestId("bulk-dialog")).toBeInTheDocument();
  });

  it("calls bulkImportServicePackages when import is triggered", async () => {
    (servicePackageService.bulkImportServicePackages as jest.Mock).mockResolvedValue({
      added: 1,
      updated: 0,
      unchanged: 0,
      staled: 0,
    });
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Upload package.json"));
    fireEvent.click(screen.getByText("trigger-import"));
    await waitFor(() => {
      expect(servicePackageService.bulkImportServicePackages).toHaveBeenCalled();
    });
  });

  it("navigates back when the back button is clicked", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByLabelText("Back to services"));
    expect(mockRouterPush).toHaveBeenCalledWith("/company/1/environments/2");
  });

  it("shows loading state in the table while fetching", () => {
    setupMocks();
    mockUseServicePackages.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<PackagesPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("opens the notification preference dialog for the clicked package", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("notification-1"));
    expect(screen.getByTestId("notification-dialog")).toBeInTheDocument();
    expect(screen.getByText("notification-target-1")).toBeInTheDocument();
  });

  it("closes the notification preference dialog", () => {
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("notification-1"));
    fireEvent.click(screen.getByText("close-notification"));
    expect(screen.queryByTestId("notification-dialog")).not.toBeInTheDocument();
  });

  it("calls updateServicePackageNotification when a preference is submitted", async () => {
    (servicePackageService.updateServicePackageNotification as jest.Mock).mockResolvedValue(mockPackage);
    setupMocks();
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("notification-1"));
    fireEvent.click(screen.getByText("submit-mute"));
    await waitFor(() => {
      expect(servicePackageService.updateServicePackageNotification).toHaveBeenCalledWith(
        "1",
        2,
        3,
        1,
        { action: "MUTE" },
        "test-token",
      );
    });
  });
});
