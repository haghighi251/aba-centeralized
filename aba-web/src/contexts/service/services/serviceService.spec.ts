import axios from "axios";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceErrorMessage,
  Service,
} from "./serviceService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token";
const COMPANY_ID = "1";
const ENVIRONMENT_ID = 2;
const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

const mockService: Service = {
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
};

describe("serviceService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getServices ─────────────────────────────────────────────────────────

  describe("getServices", () => {
    it("calls the correct endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [mockService], total: 1 } },
      });

      const result = await getServices(COMPANY_ID, ENVIRONMENT_ID, {}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services?`,
        ),
        AUTH_HEADER,
      );
      expect(result.data).toEqual([mockService]);
      expect(result.total).toBe(1);
    });

    it("appends all filter query params when provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getServices(
        COMPANY_ID,
        ENVIRONMENT_ID,
        {
          search: "gateway",
          type: "API_GATEWAY",
          status: "ARCHIVED",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        TOKEN,
      );

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("search=gateway");
      expect(url).toContain("type=API_GATEWAY");
      expect(url).toContain("status=ARCHIVED");
      expect(url).toContain("sortBy=createdAt");
      expect(url).toContain("sortOrder=desc");
    });

    it("omits query params when filter fields are not provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getServices(COMPANY_ID, ENVIRONMENT_ID, {}, TOKEN);

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toBe(`/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services?`);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(
        getServices(COMPANY_ID, ENVIRONMENT_ID, {}, TOKEN),
      ).rejects.toThrow("Network error");
    });
  });

  // ── getServiceById ──────────────────────────────────────────────────────

  describe("getServiceById", () => {
    it("calls the correct endpoint and returns the service", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: mockService },
      });

      const result = await getServiceById(COMPANY_ID, ENVIRONMENT_ID, mockService.id, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services/${mockService.id}`,
        AUTH_HEADER,
      );
      expect(result).toEqual(mockService);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Not found"));
      await expect(
        getServiceById(COMPANY_ID, ENVIRONMENT_ID, 999, TOKEN),
      ).rejects.toThrow("Not found");
    });
  });

  // ── createService ───────────────────────────────────────────────────────

  describe("createService", () => {
    it("sends POST to the correct endpoint with the payload", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, error: null, data: mockService },
      });

      const payload = {
        name: "API Gateway",
        type: "API_GATEWAY" as const,
        baseUrl: "https://api.example.com",
        rateLimitConfig: { windowMs: 60000, max: 100 },
      };

      const result = await createService(COMPANY_ID, ENVIRONMENT_ID, payload, TOKEN);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services`,
        payload,
        AUTH_HEADER,
      );
      expect(result).toEqual(mockService);
    });

    it("propagates axios errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Conflict"));
      await expect(
        createService(
          COMPANY_ID,
          ENVIRONMENT_ID,
          { name: "API Gateway", baseUrl: "https://api.example.com" },
          TOKEN,
        ),
      ).rejects.toThrow("Conflict");
    });
  });

  // ── updateService ───────────────────────────────────────────────────────

  describe("updateService", () => {
    it("sends PUT to the correct endpoint with the payload", async () => {
      const updated = { ...mockService, name: "Payments API" };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: updated },
      });

      const result = await updateService(
        COMPANY_ID,
        ENVIRONMENT_ID,
        mockService.id,
        { name: "Payments API" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services/${mockService.id}`,
        { name: "Payments API" },
        AUTH_HEADER,
      );
      expect(result).toEqual(updated);
    });

    it("propagates axios errors", async () => {
      mockedAxios.put.mockRejectedValue(new Error("Not found"));
      await expect(
        updateService(COMPANY_ID, ENVIRONMENT_ID, 999, { name: "X" }, TOKEN),
      ).rejects.toThrow("Not found");
    });
  });

  // ── deleteService ───────────────────────────────────────────────────────

  describe("deleteService", () => {
    it("sends DELETE to the correct endpoint", async () => {
      mockedAxios.delete.mockResolvedValue({
        data: { success: true, error: null, data: mockService },
      });

      await deleteService(COMPANY_ID, ENVIRONMENT_ID, mockService.id, TOKEN);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services/${mockService.id}`,
        AUTH_HEADER,
      );
    });

    it("propagates axios errors", async () => {
      mockedAxios.delete.mockRejectedValue(new Error("Not found"));
      await expect(
        deleteService(COMPANY_ID, ENVIRONMENT_ID, 999, TOKEN),
      ).rejects.toThrow("Not found");
    });
  });

  // ── getServiceErrorMessage ──────────────────────────────────────────────

  describe("getServiceErrorMessage", () => {
    it("returns the error message from the response envelope", () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { success: false, error: "A service with this slug already exists.", data: null },
        },
      };
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      expect(getServiceErrorMessage(error, "fallback")).toBe(
        "A service with this slug already exists.",
      );
    });

    it("returns the fallback when the error is not an axios error", () => {
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false);

      expect(getServiceErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    });

    it("returns the fallback when the response has no error message", () => {
      const error = { isAxiosError: true, response: { data: {} } };
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      expect(getServiceErrorMessage(error, "fallback")).toBe("fallback");
    });
  });
});
