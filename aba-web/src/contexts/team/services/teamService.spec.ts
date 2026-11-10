import axios from "axios";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamErrorMessage,
  Team,
} from "./teamService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token";
const COMPANY_ID = "1";
const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

const mockTeam: Team = {
  id: 1,
  name: "Platform",
  slug: "platform",
  description: "Core platform team",
  status: "ACTIVE",
  companyId: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("teamService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getTeams ────────────────────────────────────────────────────────────

  describe("getTeams", () => {
    it("calls the correct endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [mockTeam], total: 1 } },
      });

      const result = await getTeams(COMPANY_ID, {}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/company/${COMPANY_ID}/teams?`),
        AUTH_HEADER,
      );
      expect(result.data).toEqual([mockTeam]);
      expect(result.total).toBe(1);
    });

    it("appends query params when filter is provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getTeams(
        COMPANY_ID,
        { search: "platform", status: "ARCHIVED", sortBy: "createdAt", sortOrder: "desc" },
        TOKEN,
      );

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("search=platform");
      expect(url).toContain("status=ARCHIVED");
      expect(url).toContain("sortBy=createdAt");
      expect(url).toContain("sortOrder=desc");
    });

    it("omits query params when filter fields are not provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getTeams(COMPANY_ID, {}, TOKEN);

      const url: string = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toBe(`/company/${COMPANY_ID}/teams?`);
    });

    it("propagates axios errors", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(getTeams(COMPANY_ID, {}, TOKEN)).rejects.toThrow("Network error");
    });
  });

  // ── createTeam ──────────────────────────────────────────────────────────

  describe("createTeam", () => {
    it("sends POST to the correct endpoint with the payload", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, error: null, data: mockTeam },
      });

      const result = await createTeam(
        COMPANY_ID,
        { name: "Platform", description: "Core platform team" },
        TOKEN,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/teams`,
        { name: "Platform", description: "Core platform team" },
        AUTH_HEADER,
      );
      expect(result).toEqual(mockTeam);
    });

    it("propagates axios errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Conflict"));
      await expect(
        createTeam(COMPANY_ID, { name: "Platform" }, TOKEN),
      ).rejects.toThrow("Conflict");
    });
  });

  // ── updateTeam ──────────────────────────────────────────────────────────

  describe("updateTeam", () => {
    it("sends PUT to the correct endpoint with the payload", async () => {
      const updated = { ...mockTeam, name: "Platform Team", status: "ARCHIVED" as const };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: updated },
      });

      const result = await updateTeam(
        COMPANY_ID,
        mockTeam.id,
        { name: "Platform Team", status: "ARCHIVED" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/teams/${mockTeam.id}`,
        { name: "Platform Team", status: "ARCHIVED" },
        AUTH_HEADER,
      );
      expect(result).toEqual(updated);
    });

    it("propagates axios errors", async () => {
      mockedAxios.put.mockRejectedValue(new Error("Not found"));
      await expect(
        updateTeam(COMPANY_ID, 999, { name: "X" }, TOKEN),
      ).rejects.toThrow("Not found");
    });
  });

  // ── deleteTeam ──────────────────────────────────────────────────────────

  describe("deleteTeam", () => {
    it("sends DELETE to the correct endpoint", async () => {
      mockedAxios.delete.mockResolvedValue({
        data: { success: true, error: null, data: mockTeam },
      });

      await deleteTeam(COMPANY_ID, mockTeam.id, TOKEN);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/company/${COMPANY_ID}/teams/${mockTeam.id}`,
        AUTH_HEADER,
      );
    });

    it("propagates axios errors", async () => {
      mockedAxios.delete.mockRejectedValue(new Error("Not found"));
      await expect(deleteTeam(COMPANY_ID, 999, TOKEN)).rejects.toThrow("Not found");
    });
  });

  // ── getTeamErrorMessage ─────────────────────────────────────────────────

  describe("getTeamErrorMessage", () => {
    it("returns the error message from the response envelope", () => {
      const error = {
        isAxiosError: true,
        response: { data: { success: false, error: "A team with this slug already exists.", data: null } },
      };
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      expect(getTeamErrorMessage(error, "fallback")).toBe(
        "A team with this slug already exists.",
      );
    });

    it("returns the fallback when the error is not an axios error", () => {
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false);

      expect(getTeamErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    });

    it("returns the fallback when the response has no error message", () => {
      const error = { isAxiosError: true, response: { data: {} } };
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      expect(getTeamErrorMessage(error, "fallback")).toBe("fallback");
    });
  });
});
