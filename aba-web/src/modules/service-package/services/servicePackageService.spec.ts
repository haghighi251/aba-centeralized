import axios from "axios";
import {
  getServicePackages,
  getServicePackageHistory,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  bulkImportServicePackages,
  updateServicePackageNotification,
  getServicePackageErrorMessage,
} from "./servicePackageService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TOKEN = "test-token";
const COMPANY_ID = "1";
const ENVIRONMENT_ID = 2;
const SERVICE_ID = 3;
const SP_ID = 10;
const AUTH_HEADER = { headers: { Authorization: `Bearer ${TOKEN}` } };

const mockPackage = {
  id: 1,
  ecosystem: "NPM",
  name: "express",
  version: "4.18.2",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockServicePackage = {
  id: SP_ID,
  status: "ACTIVE",
  versionRange: "^4.18.0",
  introducedAt: "2024-01-01T00:00:00.000Z",
  deactivatedAt: null,
  alarmCount: 0,
  lastAlarmAt: null,
  serviceId: SERVICE_ID,
  packageId: 1,
  package: mockPackage,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const BASE = `/company/${COMPANY_ID}/environments/${ENVIRONMENT_ID}/services/${SERVICE_ID}/packages`;

describe("servicePackageService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getServicePackages ───────────────────────────────────────────────────

  describe("getServicePackages", () => {
    it("calls the correct endpoint and returns parsed result", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [mockServicePackage], total: 1 } },
      });

      const result = await getServicePackages(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(BASE),
        AUTH_HEADER,
      );
      expect(result.data).toEqual([mockServicePackage]);
      expect(result.total).toBe(1);
    });

    it("appends filter query params", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getServicePackages(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        { search: "express", ecosystem: "NPM", sortBy: "name", sortOrder: "asc" },
        TOKEN,
      );

      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("search=express");
      expect(url).toContain("ecosystem=NPM");
      expect(url).toContain("sortBy=name");
      expect(url).toContain("sortOrder=asc");
    });
  });

  // ── getServicePackageHistory ─────────────────────────────────────────────

  describe("getServicePackageHistory", () => {
    it("calls the /history endpoint with correct auth", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getServicePackageHistory(COMPANY_ID, ENVIRONMENT_ID, SERVICE_ID, {}, TOKEN);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`${BASE}/history`),
        AUTH_HEADER,
      );
    });

    it("appends status filter query param", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, error: null, data: { data: [], total: 0 } },
      });

      await getServicePackageHistory(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        { status: "STALE" },
        TOKEN,
      );

      const url = mockedAxios.get.mock.calls[0][0] as string;
      expect(url).toContain("status=STALE");
    });
  });

  // ── createServicePackage ─────────────────────────────────────────────────

  describe("createServicePackage", () => {
    it("POSTs the payload and returns the new service package", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, error: null, data: mockServicePackage },
      });

      const payload = { name: "express", version: "4.18.2", ecosystem: "NPM" as const };
      const result = await createServicePackage(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        payload,
        TOKEN,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(BASE, payload, AUTH_HEADER);
      expect(result).toEqual(mockServicePackage);
    });
  });

  // ── updateServicePackage ─────────────────────────────────────────────────

  describe("updateServicePackage", () => {
    it("PUTs to the correct endpoint and returns the updated package", async () => {
      const updated = { ...mockServicePackage, versionRange: "^4.19.0" };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: updated },
      });

      const result = await updateServicePackage(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        SP_ID,
        { versionRange: "^4.19.0" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `${BASE}/${SP_ID}`,
        { versionRange: "^4.19.0" },
        AUTH_HEADER,
      );
      expect(result.versionRange).toBe("^4.19.0");
    });
  });

  // ── deleteServicePackage ─────────────────────────────────────────────────

  describe("deleteServicePackage", () => {
    it("DELETEs the correct endpoint and returns the removed package", async () => {
      const removed = { ...mockServicePackage, status: "REMOVED" };
      mockedAxios.delete.mockResolvedValue({
        data: { success: true, error: null, data: removed },
      });

      const result = await deleteServicePackage(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        SP_ID,
        TOKEN,
      );

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `${BASE}/${SP_ID}`,
        AUTH_HEADER,
      );
      expect(result.status).toBe("REMOVED");
    });
  });

  // ── bulkImportServicePackages ────────────────────────────────────────────

  describe("bulkImportServicePackages", () => {
    it("POSTs to /bulk and returns the import summary", async () => {
      const importResult = { added: 5, updated: 1, unchanged: 2, staled: 1 };
      mockedAxios.post.mockResolvedValue({
        data: { success: true, error: null, data: importResult },
      });

      const payload = {
        ecosystem: "NPM" as const,
        packages: [{ name: "express", version: "4.18.2" }],
      };
      const result = await bulkImportServicePackages(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        payload,
        TOKEN,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${BASE}/bulk`,
        payload,
        AUTH_HEADER,
      );
      expect(result).toEqual(importResult);
    });
  });

  // ── updateServicePackageNotification ─────────────────────────────────────

  describe("updateServicePackageNotification", () => {
    it("PUTs a MUTE action to the notification-preference endpoint", async () => {
      const muted = { ...mockServicePackage, notificationState: { muted: true, mutedAt: "now", lastNotifiedAt: null, nextNotifyAt: null } };
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: muted },
      });

      const result = await updateServicePackageNotification(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        SP_ID,
        { action: "MUTE" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `${BASE}/${SP_ID}/notification-preference`,
        { action: "MUTE" },
        AUTH_HEADER,
      );
      expect(result).toEqual(muted);
    });

    it("PUTs a SNOOZE action with the chosen date", async () => {
      mockedAxios.put.mockResolvedValue({
        data: { success: true, error: null, data: mockServicePackage },
      });

      await updateServicePackageNotification(
        COMPANY_ID,
        ENVIRONMENT_ID,
        SERVICE_ID,
        SP_ID,
        { action: "SNOOZE", until: "2026-08-15T00:00:00.000Z" },
        TOKEN,
      );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        `${BASE}/${SP_ID}/notification-preference`,
        { action: "SNOOZE", until: "2026-08-15T00:00:00.000Z" },
        AUTH_HEADER,
      );
    });
  });

  // ── getServicePackageErrorMessage ────────────────────────────────────────

  describe("getServicePackageErrorMessage", () => {
    it("returns the error message from the API response envelope", () => {
      const axiosError = {
        isAxiosError: true,
        response: { data: { error: "Package already exists." } },
      };
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const msg = getServicePackageErrorMessage(axiosError, "Fallback");
      expect(msg).toBe("Package already exists.");
    });

    it("returns the fallback when no API error message is present", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(false);
      const msg = getServicePackageErrorMessage(new Error("network"), "Fallback message");
      expect(msg).toBe("Fallback message");
    });
  });
});
