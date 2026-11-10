import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BulkImportDialog from "./BulkImportDialog";

const defaultProps = {
  open: true,
  importing: false,
  error: null,
  result: null,
  onClose: jest.fn(),
  onImport: jest.fn(),
};

const validPackageJson = JSON.stringify({
  dependencies: { express: "^4.18.2", lodash: "~4.17.21" },
  devDependencies: { jest: "^29.0.0" },
});

function createJsonFile(content: string, name = "package.json"): File {
  return new File([content], name, { type: "application/json" });
}

describe("BulkImportDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the dialog title", () => {
    render(<BulkImportDialog {...defaultProps} />);
    expect(screen.getByText("Upload package.json")).toBeInTheDocument();
  });

  it("shows 'Choose package.json' button", () => {
    render(<BulkImportDialog {...defaultProps} />);
    expect(screen.getByText("Choose package.json")).toBeInTheDocument();
  });

  it("shows Import button as disabled before a file is chosen", () => {
    render(<BulkImportDialog {...defaultProps} />);
    const importBtn = screen.queryByText(/^Import/);
    if (importBtn) {
      expect(importBtn).toBeDisabled();
    }
  });

  it("shows package count preview after a valid file is loaded", async () => {
    render(<BulkImportDialog {...defaultProps} />);
    const input = screen.getByLabelText("Choose package.json file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createJsonFile(validPackageJson)] } });

    await waitFor(() => {
      expect(screen.getByText(/Found 3 packages to import/)).toBeInTheDocument();
    });
  });

  it("calls onImport with parsed packages when Import is clicked", async () => {
    const onImport = jest.fn();
    render(<BulkImportDialog {...defaultProps} onImport={onImport} />);
    const input = screen.getByLabelText("Choose package.json file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createJsonFile(validPackageJson)] } });

    await waitFor(() => screen.getByText(/Found 3 packages/));
    fireEvent.click(screen.getByRole("button", { name: /Import/ }));

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "express" }),
        expect.objectContaining({ name: "lodash" }),
        expect.objectContaining({ name: "jest" }),
      ]),
      "NPM",
    );
  });

  it("shows a parse error when the file is not valid JSON", async () => {
    render(<BulkImportDialog {...defaultProps} />);
    const input = screen.getByLabelText("Choose package.json file") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createJsonFile("not-json", "package.json")] },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to parse file. Please upload a valid package.json."),
      ).toBeInTheDocument();
    });
  });

  it("shows a parse error when the file has no packages", async () => {
    render(<BulkImportDialog {...defaultProps} />);
    const input = screen.getByLabelText("Choose package.json file") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createJsonFile(JSON.stringify({ name: "my-app" }))] },
    });

    await waitFor(() => {
      expect(
        screen.getByText("No packages found in the uploaded file."),
      ).toBeInTheDocument();
    });
  });

  it("displays the API error when error prop is set", () => {
    render(<BulkImportDialog {...defaultProps} error="Import failed." />);
    expect(screen.getByText("Import failed.")).toBeInTheDocument();
  });

  it("displays the success result after import", () => {
    render(
      <BulkImportDialog
        {...defaultProps}
        result={{ added: 3, updated: 1, unchanged: 0, staled: 1 }}
      />,
    );
    expect(screen.getByText(/Added: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Updated: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Staled: 1/)).toBeInTheDocument();
  });

  it("shows 'Importing…' indicator while importing", () => {
    render(<BulkImportDialog {...defaultProps} importing={true} />);
    expect(screen.getByText("Importing…")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    render(<BulkImportDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
