import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PackageFormDialog from "./PackageFormDialog";
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
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const defaultProps = {
  open: true,
  editing: null,
  saving: false,
  error: null,
  onClose: jest.fn(),
  onSave: jest.fn(),
};

describe("PackageFormDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders 'Add Package' title when editing is null", () => {
    render(<PackageFormDialog {...defaultProps} />);
    expect(screen.getByText("Add Package")).toBeInTheDocument();
  });

  it("renders 'Edit Package' title when editing is set", () => {
    render(<PackageFormDialog {...defaultProps} editing={mockSP} />);
    expect(screen.getByText("Edit Package")).toBeInTheDocument();
  });

  it("pre-fills form fields when editing", () => {
    render(<PackageFormDialog {...defaultProps} editing={mockSP} />);
    expect(screen.getByDisplayValue("express")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4.18.2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("^4.18.0")).toBeInTheDocument();
  });

  it("disables name field when editing", () => {
    render(<PackageFormDialog {...defaultProps} editing={mockSP} />);
    const nameInput = screen.getByLabelText("Package Name");
    expect(nameInput).toBeDisabled();
  });

  it("disables Save button when name is empty (create mode)", () => {
    render(<PackageFormDialog {...defaultProps} />);
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("enables Save button after filling in name and version", () => {
    render(<PackageFormDialog {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Package Name"), {
      target: { value: "lodash" },
    });
    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "4.17.21" },
    });
    expect(screen.getByText("Save")).not.toBeDisabled();
  });

  it("calls onSave with create payload when submitted in create mode", () => {
    const onSave = jest.fn();
    render(<PackageFormDialog {...defaultProps} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Package Name"), {
      target: { value: "lodash" },
    });
    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "4.17.21" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "lodash", version: "4.17.21" }),
    );
  });

  it("calls onSave with update payload when submitted in edit mode (version change)", () => {
    const onSave = jest.fn();
    render(<PackageFormDialog {...defaultProps} editing={mockSP} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "4.19.0" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ version: "4.19.0" }),
    );
  });

  it("shows version-change warning when version is modified during edit", () => {
    render(<PackageFormDialog {...defaultProps} editing={mockSP} />);
    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "5.0.0" },
    });
    expect(
      screen.getByText(
        "Changing the version will mark the current version as stale.",
      ),
    ).toBeInTheDocument();
  });

  it("displays the error alert when error prop is set", () => {
    render(
      <PackageFormDialog {...defaultProps} error="Package already exists." />,
    );
    expect(screen.getByText("Package already exists.")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    render(<PackageFormDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows 'Saving…' and disables Save while saving", () => {
    render(<PackageFormDialog {...defaultProps} editing={mockSP} saving={true} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.getByText("Saving…")).toBeDisabled();
  });
});
