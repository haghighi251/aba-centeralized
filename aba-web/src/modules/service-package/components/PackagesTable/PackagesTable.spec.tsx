import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PackagesTable from "./PackagesTable";
import type { ServicePackage } from "@/modules/service-package/types/types";

const mockPackages: ServicePackage[] = [
  {
    id: 1,
    status: "ACTIVE",
    versionRange: "^4.18.0",
    introducedAt: "2024-01-15T00:00:00.000Z",
    deactivatedAt: null,
    alarmCount: 2,
    lastAlarmAt: null,
    serviceId: 3,
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
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 3,
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

const noop = jest.fn();

describe("PackagesTable", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the table headers", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Package Name")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("Ecosystem")).toBeInTheDocument();
    expect(screen.getByText("Introduced")).toBeInTheDocument();
  });

  it("renders all package rows", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={false}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("express")).toBeInTheDocument();
    expect(screen.getByText("4.18.2")).toBeInTheDocument();
    expect(screen.getByText("lodash")).toBeInTheDocument();
    expect(screen.getByText("4.17.21")).toBeInTheDocument();
  });

  it("shows '—' for null versionRange", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={false}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows a spinner when loading", () => {
    render(
      <PackagesTable
        packages={[]}
        loading={true}
        canManage={false}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows empty state when no packages and not loading", () => {
    render(
      <PackagesTable
        packages={[]}
        loading={false}
        canManage={false}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("No active packages for this service.")).toBeInTheDocument();
  });

  it("renders Actions column only when canManage=true", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("does not render Actions column when canManage=false", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={false}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("calls onEdit when the edit button is clicked", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByLabelText("Edit express"));
    expect(noop).toHaveBeenCalledWith(mockPackages[0]);
  });

  it("calls onDelete when the delete button is clicked", () => {
    const onDelete = jest.fn();
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByLabelText("Delete express"));
    expect(onDelete).toHaveBeenCalledWith(mockPackages[0]);
  });

  it("shows the alarm count", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={false}
        onEdit={noop}
        onNotificationPreference={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onNotificationPreference when the notification button is clicked", () => {
    const onNotificationPreference = jest.fn();
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onDelete={noop}
        onNotificationPreference={onNotificationPreference}
      />,
    );
    fireEvent.click(screen.getByLabelText("Notification preference for express"));
    expect(onNotificationPreference).toHaveBeenCalledWith(mockPackages[0]);
  });

  it("shows an active-notifications icon for a package with no notification state", () => {
    render(
      <PackagesTable
        packages={mockPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onDelete={noop}
        onNotificationPreference={noop}
      />,
    );
    expect(screen.getAllByTestId("NotificationsActiveIcon")).toHaveLength(mockPackages.length);
  });

  it("shows a muted icon for a package whose notifications are muted", () => {
    const mutedPackages: ServicePackage[] = [
      {
        ...mockPackages[0],
        notificationState: { muted: true, mutedAt: "2024-03-01T00:00:00.000Z", lastNotifiedAt: null, nextNotifyAt: null },
      },
    ];
    render(
      <PackagesTable
        packages={mutedPackages}
        loading={false}
        canManage={true}
        onEdit={noop}
        onDelete={noop}
        onNotificationPreference={noop}
      />,
    );
    expect(screen.getByTestId("NotificationsOffIcon")).toBeInTheDocument();
  });
});
