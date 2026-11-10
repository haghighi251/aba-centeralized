import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import EnvironmentServicesPage from "./page";
import * as serviceService from "@/contexts/service/services/serviceService";
import * as environmentService from "@/contexts/environment/services/environmentService";

jest.mock("next-auth/react");
jest.mock("next/navigation");
jest.mock("@/contexts/service/services/serviceService");
jest.mock("@/contexts/environment/services/environmentService");

jest.setTimeout(15000);

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

const mockEnvironment: environmentService.Environment = {
  id: 2,
  name: "Production",
  slug: "production",
  type: "PRODUCTION",
  isProduction: true,
  order: 4,
  description: "Main production environment",
  status: "ACTIVE",
  companyId: 1,
  teamId: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockServices: serviceService.Service[] = [
  {
    id: 1,
    name: "API Gateway",
    slug: "api-gateway",
    type: "API_GATEWAY",
    description: "Main API gateway",
    baseUrl: "https://api.example.com",
    rateLimitConfig: { windowMs: 60000, max: 100 },
    status: "ACTIVE",
    companyId: 1,
    environmentId: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Worker Service",
    slug: "worker-service",
    type: "WORKER",
    description: null,
    baseUrl: "https://worker.example.com",
    rateLimitConfig: null,
    status: "ARCHIVED",
    companyId: 1,
    environmentId: 2,
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  },
];

/** MUI Select doesn't wire up label `for`/`id` for getByLabelText — find the combobox via its FormControl. */
function getSelect(labelText: string) {
  const label = screen.getByText(labelText, { selector: "label" });
  const formControl = label.closest(".MuiFormControl-root") as HTMLElement;
  return within(formControl).getByRole("combobox");
}

function setupMocks(
  overrides: { session?: typeof mockOwnerSession; services?: serviceService.Service[] } = {},
) {
  (useSession as jest.Mock).mockReturnValue(overrides.session ?? mockOwnerSession);
  (useParams as jest.Mock).mockReturnValue({ id: "1", envId: "2" });
  (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  (environmentService.getEnvironmentById as jest.Mock).mockResolvedValue(mockEnvironment);
  (serviceService.getServices as jest.Mock).mockResolvedValue({
    data: overrides.services ?? mockServices,
    total: (overrides.services ?? mockServices).length,
  });
  (environmentService.getEnvironmentErrorMessage as jest.Mock).mockImplementation(
    (_e: unknown, fallback: string) => fallback,
  );
  (serviceService.getServiceErrorMessage as jest.Mock).mockImplementation(
    (_e: unknown, fallback: string) => fallback,
  );
}

describe("EnvironmentServicesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("loads the environment and its services on mount", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);

    await waitFor(() => {
      expect(screen.getByText("api-gateway")).toBeInTheDocument();
      expect(screen.getByText("worker-service")).toBeInTheDocument();
    });

    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(environmentService.getEnvironmentById).toHaveBeenCalledWith("1", 2, "test-token");
    expect(serviceService.getServices).toHaveBeenCalledWith("1", 2, {}, "test-token");
  });

  it("navigates back to the environments list", async () => {
    setupMocks();
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.click(screen.getByLabelText("Back to environments"));
    expect(push).toHaveBeenCalledWith("/company/1/environments");
  });

  it("shows the Add Service button for BUSINESS_OWNER", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));
    expect(screen.getByRole("button", { name: /Add Service/i })).toBeInTheDocument();
  });

  it("hides Add Service button and edit/delete actions for BUSINESS_MEMBER, but keeps view", async () => {
    setupMocks({ session: mockMemberSession });
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    expect(screen.queryByRole("button", { name: /Add Service/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("EditIcon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("DeleteIcon")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("VisibilityIcon").length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no services", async () => {
    setupMocks({ services: [] });
    render(<EnvironmentServicesPage />);

    await waitFor(() => {
      expect(screen.getByText("No services found.")).toBeInTheDocument();
    });
  });

  it("shows an error alert when loading fails", async () => {
    setupMocks();
    (serviceService.getServices as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<EnvironmentServicesPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load environment.")).toBeInTheDocument();
    });
  });

  it("does not call getServices when there is no access token", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { tokens: { accessToken: "" }, role: "BUSINESS_OWNER" } },
    });
    (useParams as jest.Mock).mockReturnValue({ id: "1", envId: "2" });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });

    render(<EnvironmentServicesPage />);

    expect(serviceService.getServices).not.toHaveBeenCalled();
  });

  it("opens the view dialog with service details when a row is clicked", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    const apiGatewayRow = screen.getByText("api-gateway").closest("tr")!;
    fireEvent.click(within(apiGatewayRow).getAllByRole("cell")[0]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("https://api.example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("100 / 60s")).toBeInTheDocument();
    expect(within(dialog).getByText("Main API gateway")).toBeInTheDocument();
  });

  it("re-fetches with the search filter when changed", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "gateway" } });

    await waitFor(() => {
      expect(serviceService.getServices).toHaveBeenLastCalledWith(
        "1",
        2,
        { search: "gateway" },
        "test-token",
      );
    });
  });

  it("re-fetches with the type filter when changed", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.mouseDown(getSelect("Type"));
    fireEvent.click(await screen.findByRole("option", { name: "Worker" }));

    await waitFor(() => {
      expect(serviceService.getServices).toHaveBeenLastCalledWith(
        "1",
        2,
        { type: "WORKER" },
        "test-token",
      );
    });
  });

  it("re-fetches with the status filter when changed", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.mouseDown(getSelect("Status"));
    fireEvent.click(await screen.findByRole("option", { name: "ARCHIVED" }));

    await waitFor(() => {
      expect(serviceService.getServices).toHaveBeenLastCalledWith(
        "1",
        2,
        { status: "ARCHIVED" },
        "test-token",
      );
    });
  });

  it("creates a new service via the Add Service dialog", async () => {
    setupMocks();
    const created: serviceService.Service = {
      id: 3,
      name: "Notification Service",
      slug: "notification-service",
      type: "OTHER",
      description: null,
      baseUrl: "https://notify.example.com",
      rateLimitConfig: null,
      status: "ACTIVE",
      companyId: 1,
      environmentId: 2,
      createdAt: "2024-03-01T00:00:00.000Z",
      updatedAt: "2024-03-01T00:00:00.000Z",
    };
    (serviceService.createService as jest.Mock).mockResolvedValue(created);

    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.click(screen.getByRole("button", { name: /Add Service/i }));

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: "Notification Service" },
    });
    fireEvent.change(screen.getByLabelText(/^Base URL/), {
      target: { value: "https://notify.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add Service$/i }));

    await waitFor(() => {
      expect(serviceService.createService).toHaveBeenCalledWith(
        "1",
        2,
        {
          name: "Notification Service",
          type: "OTHER",
          description: null,
          baseUrl: "https://notify.example.com",
          rateLimitConfig: null,
        },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("notification-service")).toBeInTheDocument());
  });

  it("disables the save button when name or base URL is missing", async () => {
    setupMocks();
    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.click(screen.getByRole("button", { name: /Add Service/i }));

    expect(screen.getByRole("button", { name: /^Add Service$/i })).toBeDisabled();
  });

  it("edits an existing service", async () => {
    setupMocks();
    const updated = { ...mockServices[0], name: "Edge Gateway" };
    (serviceService.updateService as jest.Mock).mockResolvedValue(updated);

    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    const editButtons = screen.getAllByTestId("EditIcon");
    fireEvent.click(editButtons[0].closest("button")!);

    expect(screen.getByDisplayValue("API Gateway")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Edge Gateway" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(serviceService.updateService).toHaveBeenCalledWith(
        "1",
        2,
        1,
        {
          name: "Edge Gateway",
          type: "API_GATEWAY",
          description: "Main API gateway",
          baseUrl: "https://api.example.com",
          rateLimitConfig: { windowMs: 60000, max: 100 },
          status: "ACTIVE",
        },
        "test-token",
      );
    });
    await waitFor(() => expect(screen.getByText("Edge Gateway")).toBeInTheDocument());
  });

  it("deletes a service after confirmation", async () => {
    setupMocks();
    (serviceService.deleteService as jest.Mock).mockResolvedValue(undefined);

    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    const apiGatewayRow = screen.getByText("api-gateway").closest("tr")!;
    fireEvent.click(within(apiGatewayRow).getByTestId("DeleteIcon").closest("button")!);

    expect(window.confirm).toHaveBeenCalledWith('Delete service "API Gateway"?');
    await waitFor(() => {
      expect(serviceService.deleteService).toHaveBeenCalledWith("1", 2, 1, "test-token");
    });
    await waitFor(() => expect(screen.queryByText("api-gateway")).not.toBeInTheDocument());
  });

  it("does not delete a service when the confirmation is cancelled", async () => {
    setupMocks();
    window.confirm = jest.fn(() => false);

    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    const apiGatewayRow = screen.getByText("api-gateway").closest("tr")!;
    fireEvent.click(within(apiGatewayRow).getByTestId("DeleteIcon").closest("button")!);

    expect(serviceService.deleteService).not.toHaveBeenCalled();
    expect(screen.getByText("api-gateway")).toBeInTheDocument();
  });

  it("shows a form error when create fails", async () => {
    setupMocks();
    (serviceService.createService as jest.Mock).mockRejectedValue(new Error("Conflict"));

    render(<EnvironmentServicesPage />);
    await waitFor(() => screen.getByText("api-gateway"));

    fireEvent.click(screen.getByRole("button", { name: /Add Service/i }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Notification" } });
    fireEvent.change(screen.getByLabelText(/^Base URL/), {
      target: { value: "https://notify.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add Service$/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create service.")).toBeInTheDocument();
    });
  });
});
