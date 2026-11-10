import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationPreferenceDialog from "./NotificationPreferenceDialog";
import type { ServicePackage } from "@/modules/service-package/types/types";

const mockSP: ServicePackage = {
  id: 10,
  status: "ACTIVE",
  versionRange: "^4.18.0",
  introducedAt: "2024-01-01T00:00:00.000Z",
  deactivatedAt: null,
  alarmCount: 0,
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
  notificationState: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const defaultProps = {
  open: true,
  pkg: mockSP,
  saving: false,
  error: null,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

describe("NotificationPreferenceDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing when there is no package", () => {
    const { container } = render(<NotificationPreferenceDialog {...defaultProps} pkg={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Mute and Snooze actions when not muted", () => {
    render(<NotificationPreferenceDialog {...defaultProps} />);
    expect(screen.getByText("Mute indefinitely")).toBeInTheDocument();
    expect(screen.getByText("Snooze")).toBeInTheDocument();
    expect(screen.queryByText("Unmute")).not.toBeInTheDocument();
  });

  it("shows only Unmute when already muted", () => {
    const mutedSP = {
      ...mockSP,
      notificationState: { muted: true, mutedAt: "2024-03-01T00:00:00.000Z", lastNotifiedAt: null, nextNotifyAt: null },
    };
    render(<NotificationPreferenceDialog {...defaultProps} pkg={mutedSP} />);
    expect(screen.getByText("Unmute")).toBeInTheDocument();
    expect(screen.queryByText("Mute indefinitely")).not.toBeInTheDocument();
    expect(screen.queryByText("Snooze")).not.toBeInTheDocument();
  });

  it("calls onSubmit with a MUTE action", () => {
    const onSubmit = jest.fn();
    render(<NotificationPreferenceDialog {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Mute indefinitely"));
    expect(onSubmit).toHaveBeenCalledWith({ action: "MUTE" });
  });

  it("calls onSubmit with an UNMUTE action", () => {
    const onSubmit = jest.fn();
    const mutedSP = {
      ...mockSP,
      notificationState: { muted: true, mutedAt: "2024-03-01T00:00:00.000Z", lastNotifiedAt: null, nextNotifyAt: null },
    };
    render(<NotificationPreferenceDialog {...defaultProps} pkg={mutedSP} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Unmute"));
    expect(onSubmit).toHaveBeenCalledWith({ action: "UNMUTE" });
  });

  it("disables Snooze until a future date is chosen", () => {
    render(<NotificationPreferenceDialog {...defaultProps} />);
    expect(screen.getByText("Snooze")).toBeDisabled();
  });

  it("calls onSubmit with a SNOOZE action once a future date is entered", () => {
    const onSubmit = jest.fn();
    render(<NotificationPreferenceDialog {...defaultProps} onSubmit={onSubmit} />);

    const futureYear = new Date().getFullYear() + 5;
    fireEvent.change(screen.getByLabelText("Snooze until"), {
      target: { value: `${futureYear}-01-01T10:00` },
    });

    const snoozeButton = screen.getByText("Snooze");
    expect(snoozeButton).not.toBeDisabled();
    fireEvent.click(snoozeButton);

    expect(onSubmit).toHaveBeenCalledWith({
      action: "SNOOZE",
      until: expect.any(String),
    });
  });

  it("disables actions and shows Saving… while saving", () => {
    render(<NotificationPreferenceDialog {...defaultProps} saving={true} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows the error message when present", () => {
    render(<NotificationPreferenceDialog {...defaultProps} error="Something went wrong." />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });
});
