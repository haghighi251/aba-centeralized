import axios from "axios";
import {
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getEnvironmentErrorMessage,
  Environment,
} from "./environmentService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token";
const COMPANY_ID = "1";
const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

const mockEnvironment: Environment = {
  id: 1,
  name: "Production",
  slug: "production",
  type: "PRODUCTION",
  isProduction: true,
  order: 4,
  description: "Main production environment",
  status: "ACTIVE",
  companyId: 1,
  teamId: 2,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("environmentService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getEnvironments ─────────────────────────────────────────────────────

  describe("getEnvironments", () => {
    it("calls the correct endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [mockEnvironment], total: 1 } },
      });

      const result = await getEnvironments(COMPANY_ID, {}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/company/${COMPANY_ID}/environments?`),
        AUTH_HEADER,
      );
      expect(result.data).toEqual([mockEnvironment]);
      expect(result.total).toBe(1);
    });

    it("appends the teamId query param when provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getEnvironments(COMPANY_ID, { teamId: 2 }, TOKEN);

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("teamId=2");
    });

    it("appends all other query params when filter is provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getEnvironments(
        COMPANY_ID,
        {
          search: "prod",
          type: "PRODUCTION",
          status: "ARCHIVED",
          sortBy: "order",
          sortOrder: "desc",
        },
        TOKEN,
      );

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("search=prod");
      expect(url).toContain("type=PRODUCTION");
      expect(url).toContain("status=ARCHIVED");
      expect(url).toContain("sortBy=order");
      expect(url).toContain("sortOrder=desc");
    });

    it("omits query params when filter fields are not provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getEnvironments(COMPANY_ID, {}, TOKEN);

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toBe(`/company/${COMPANY_ID}/environments?`);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getEnvironments(COMPANY_ID, {}, TOKEN)).rejects.toThrow("Network error");
    });
  });

  // ── createEnvironment ───────────────────────────────────────────────────

  describe("createEnvironment", () => {
    it("sends POST to the correct endpoint with the payload including teamId", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, error: null, data: mockEnvironment },
      });

      const result = await createEnvironment(
        COMPANY_ID,
        { teamId: 2, name: "Production", type: "PRODUCTION" },
        TOKEN,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments`,
        { teamId: 2, name: "Production", type: "PRODUCTION" },
        AUTH_HEADER,
      );
      expect(result).toEqual(mockEnvironment);
    });

    it("propagates axios errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Conflict"));
      await expect(
        createEnvironment(COMPANY_ID, { teamId: 2, name: "Production" }, TOKEN),
      ).rejects.toThrow("Conflict");
    });
  });

  // ── updateEnvironment ───────────────────────────────────────────────────

  describe("updateEnvironment", () => {
    it("sends PUT to the correct endpoint with the payload, including teamId reassignment", async () => {
      const updated = { ...mockEnvironment, teamId: 5, name: "Prod EU" };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: updated },
      });

      const result = await updateEnvironment(
        COMPANY_ID,
        mockEnvironment.id,
        { teamId: 5, name: "Prod EU" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments/${mockEnvironment.id}`,
        { teamId: 5, name: "Prod EU" },
        AUTH_HEADER,
      );
      expect(result).toEqual(updated);
    });

    it("propagates axios errors", async () => {
      mockedAxios.put.mockRejectedValue(new Error("Not found"));
      await expect(
        updateEnvironment(COMPANY_ID, 999, { name: "X" }, TOKEN),
      ).rejects.toThrow("Not found");
    });
  });

  // ── deleteEnvironment ───────────────────────────────────────────────────

  describe("deleteEnvironment", () => {
    it("sends DELETE to the correct endpoint", async () => {
      mockedAxios.delete.mockResolvedValue({
        data: { success: true, error: null, data: mockEnvironment },
      });

      await deleteEnvironment(COMPANY_ID, mockEnvironment.id, TOKEN);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments/${mockEnvironment.id}`,
        AUTH_HEADER,
      );
    });

    it("propagates axios errors", async () => {
      mockedAxios.delete.mockRejectedValue(new Error("Not found"));
      await expect(deleteEnvironment(COMPANY_ID, 999, TOKEN)).rejects.toThrow("Not found");
    });
  });

  // ── getEnvironmentErrorMessage ──────────────────────────────────────────

  describe("getEnvironmentErrorMessage", () => {
    it("returns the error message from the response envelope", () => {
      const error = {
        isAxiosError: true,
        response: { data: { success: false, error: "An environment with this slug already exists.", data: null } },
      };
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      expect(getEnvironmentErrorMessage(error, "fallback")).toBe(
        "An environment with this slug already exists.",
      );
    });

    it("returns the fallback when the error is not an axios error", () => {
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false);

      expect(getEnvironmentErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    });

    it("returns the fallback when the response has no error message", () => {
      const error = { isAxiosError: true, response: { data: {} } };
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      expect(getEnvironmentErrorMessage(error, "fallback")).toBe("fallback");
    });
  });
});
