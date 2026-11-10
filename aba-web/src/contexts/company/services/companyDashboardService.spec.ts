import axios from "axios";
import {
  getCompanyDetails,
  getCompanyStats,
  updateCompanyDetails,
  getCompanyUsers,
  addCompanyUser,
  updateCompanyUser,
  removeCompanyUser,
  CompanyDetail,
  CompanyStats,
  CompanyUser,
} from "./companyDashboardService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token";
const COMPANY_ID = "1";
const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

const mockCompany: CompanyDetail = {
  id: 1,
  username: "acme",
  email: "acme@example.com",
  status: "ACTIVE",
  createdAt: "2024-01-01T00:00:00.000Z",
  _count: { users: 5 },
};

const mockUser: CompanyUser = {
  id: 10,
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "BUSINESS_MEMBER",
  status: "ACTIVE",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("companyDashboardService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getCompanyDetails", () => {
    it("calls the correct endpoint and returns the company", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: mockCompany },
      });

      const result = await getCompanyDetails(COMPANY_ID, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(`/company/${COMPANY_ID}`, AUTH_HEADER);
      expect(result).toEqual(mockCompany);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getCompanyDetails(COMPANY_ID, TOKEN)).rejects.toThrow("Network error");
    });
  });

  describe("getCompanyStats", () => {
    it("calls the correct endpoint and returns teams and environments counts", async () => {
      const stats: CompanyStats = { teamsCount: 3, environmentsCount: 7 };
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: stats },
      });

      const result = await getCompanyStats(COMPANY_ID, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(`/company/${COMPANY_ID}/stats`, AUTH_HEADER);
      expect(result).toEqual(stats);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getCompanyStats(COMPANY_ID, TOKEN)).rejects.toThrow("Network error");
    });
  });

  describe("updateCompanyDetails", () => {
    it("sends PUT to the correct endpoint with the payload", async () => {
      const updated = { ...mockCompany, website: "https://acme.example" };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: updated },
      });

      const result = await updateCompanyDetails(
        COMPANY_ID,
        { website: "https://acme.example" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}`,
        { website: "https://acme.example" },
        AUTH_HEADER,
      );
      expect(result).toEqual(updated);
    });

    it("propagates axios errors", async () => {
      mockedAxios.put.mockRejectedValue(new Error("Forbidden"));
      await expect(
        updateCompanyDetails(COMPANY_ID, { website: "https://acme.example" }, TOKEN),
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("getCompanyUsers", () => {
    it("calls the correct endpoint and returns the user list", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: [mockUser] },
      });

      const result = await getCompanyUsers(COMPANY_ID, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(`/company/${COMPANY_ID}/users`, AUTH_HEADER);
      expect(result).toEqual([mockUser]);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Forbidden"));
      await expect(getCompanyUsers(COMPANY_ID, TOKEN)).rejects.toThrow("Forbidden");
    });
  });

  describe("addCompanyUser", () => {
    it("sends POST to the correct endpoint with the payload", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, error: null, data: mockUser },
      });

      const result = await addCompanyUser(
        COMPANY_ID,
        { email: "user@example.com", role: "BUSINESS_MEMBER", password: "secret123" },
        TOKEN,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/users`,
        { email: "user@example.com", role: "BUSINESS_MEMBER", password: "secret123" },
        AUTH_HEADER,
      );
      expect(result).toEqual(mockUser);
    });

    it("propagates axios errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Conflict"));
      await expect(
        addCompanyUser(
          COMPANY_ID,
          { email: "user@example.com", role: "BUSINESS_MEMBER", password: "secret123" },
          TOKEN,
        ),
      ).rejects.toThrow("Conflict");
    });
  });

  describe("updateCompanyUser", () => {
    it("sends PUT to the correct endpoint with the payload", async () => {
      const updated = { ...mockUser, role: "BUSINESS_ADMIN" as const };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: updated },
      });

      const result = await updateCompanyUser(
        COMPANY_ID,
        mockUser.id,
        { role: "BUSINESS_ADMIN" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/users/${mockUser.id}`,
        { role: "BUSINESS_ADMIN" },
        AUTH_HEADER,
      );
      expect(result).toEqual(updated);
    });

    it("propagates axios errors", async () => {
      mockedAxios.put.mockRejectedValue(new Error("Not found"));
      await expect(
        updateCompanyUser(COMPANY_ID, 999, { role: "BUSINESS_ADMIN" }, TOKEN),
      ).rejects.toThrow("Not found");
    });
  });

  describe("removeCompanyUser", () => {
    it("sends DELETE to the correct endpoint", async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true, error: null, data: null } });

      await removeCompanyUser(COMPANY_ID, mockUser.id, TOKEN);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/users/${mockUser.id}`,
        AUTH_HEADER,
      );
    });

    it("propagates axios errors", async () => {
      mockedAxios.delete.mockRejectedValue(new Error("Not found"));
      await expect(removeCompanyUser(COMPANY_ID, 999, TOKEN)).rejects.toThrow("Not found");
    });
  });
});
