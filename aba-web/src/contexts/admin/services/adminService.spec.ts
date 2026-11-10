import axios from "axios";
import {
  getCompanies,
  updateCompanyStatus,
  getCompaniesWithVulnerabilities,
  getActivityLogs,
} from "./adminService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token";
const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

const mockKpis = { total: 2, active: 1, inactive: 0, suspended: 0, pending: 1 };
const mockCompany = {
  id: 1,
  username: "acme",
  email: "acme@example.com",
  status: "ACTIVE",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("adminService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getCompanies ──────────────────────────────────────────────────────────

  describe("getCompanies", () => {
    it("calls the correct endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: { data: [mockCompany], total: 1, kpis: mockKpis } },
      });

      const result = await getCompanies({}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/admin/companies"),
        AUTH_HEADER,
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.kpis).toEqual(mockKpis);
    });

    it("appends query params when filter is provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: { data: [], total: 0, kpis: mockKpis } },
      });

      await getCompanies({ page: 2, limit: 5, search: "acme", status: "ACTIVE" }, TOKEN);

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("page=2");
      expect(url).toContain("limit=5");
      expect(url).toContain("search=acme");
      expect(url).toContain("status=ACTIVE");
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getCompanies({}, TOKEN)).rejects.toThrow("Network error");
    });
  });

  // ── updateCompanyStatus ───────────────────────────────────────────────────

  describe("updateCompanyStatus", () => {
    it("sends PATCH to the correct endpoint with status", async () => {
      mockedAxios.patch.mockResolvedValue({
        data: { data: { ...mockCompany, status: "INACTIVE" } },
      });

      const result = await updateCompanyStatus(1, "INACTIVE", TOKEN);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/companies/1/status"),
        { status: "INACTIVE" },
        AUTH_HEADER,
      );
      expect(result.status).toBe("INACTIVE");
    });

    it.each(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] as const)(
      "accepts valid status %s",
      async (status) => {
        mockedAxios.patch.mockResolvedValue({
          data: { data: { ...mockCompany, status } },
        });

        const result = await updateCompanyStatus(1, status, TOKEN);
        expect(result.status).toBe(status);
      },
    );

    it("propagates axios errors", async () => {
      mockedAxios.patch.mockRejectedValue(new Error("Server error"));
      await expect(updateCompanyStatus(1, "ACTIVE", TOKEN)).rejects.toThrow("Server error");
    });
  });

  // ── getCompaniesWithVulnerabilities ───────────────────────────────────────

  describe("getCompaniesWithVulnerabilities", () => {
    const mockSummary = {
      ...mockCompany,
      vulnerablePackageCount: 3,
      affectedServiceCount: 2,
      notificationCount: 5,
      hasPrimaryOwner: true,
    };

    it("calls the vulnerability-summary endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: { data: [mockSummary], total: 1 } },
      });

      const result = await getCompaniesWithVulnerabilities({}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/admin/companies/vulnerability-summary"),
        AUTH_HEADER,
      );
      expect(result.data).toEqual([mockSummary]);
      expect(result.total).toBe(1);
    });

    it("appends query params when filter is provided", async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: { data: [], total: 0 } } });

      await getCompaniesWithVulnerabilities({ page: 2, limit: 5, search: "acme", status: "ACTIVE" }, TOKEN);

      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("page=2");
      expect(url).toContain("limit=5");
      expect(url).toContain("search=acme");
      expect(url).toContain("status=ACTIVE");
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getCompaniesWithVulnerabilities({}, TOKEN)).rejects.toThrow("Network error");
    });
  });

  // ── getActivityLogs ────────────────────────────────────────────────────────

  describe("getActivityLogs", () => {
    const mockLog = {
      id: 1,
      eventType: "NOTIFICATION_SENT",
      actorUserId: null,
      companyId: 1,
      environmentId: null,
      serviceId: 5,
      servicePackageId: null,
      timestamp: "2026-01-01T00:00:00.000Z",
      metadata: { packageCount: 2 },
    };

    it("calls the activity-logs endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: { data: [mockLog], total: 1 } } });

      const result = await getActivityLogs({}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/admin/activity-logs"),
        AUTH_HEADER,
      );
      expect(result.data).toEqual([mockLog]);
      expect(result.total).toBe(1);
    });

    it("appends all filter query params when provided", async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: { data: [], total: 0 } } });

      await getActivityLogs(
        {
          page: 2,
          limit: 10,
          companyId: 1,
          environmentId: 2,
          serviceId: 3,
          eventType: "PACKAGE_MUTED",
          from: "2026-01-01T00:00:00.000Z",
          to: "2026-02-01T00:00:00.000Z",
        },
        TOKEN,
      );

      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("page=2");
      expect(url).toContain("limit=10");
      expect(url).toContain("companyId=1");
      expect(url).toContain("environmentId=2");
      expect(url).toContain("serviceId=3");
      expect(url).toContain("eventType=PACKAGE_MUTED");
      expect(url).toContain("from=");
      expect(url).toContain("to=");
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getActivityLogs({}, TOKEN)).rejects.toThrow("Network error");
    });
  });
});
