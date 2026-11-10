import axios from "axios";
import {
  getRepositoryConnection,
  createRepositoryConnection,
  rotateRepositoryConnectionSecret,
  updateRepositoryConnectionTriggerSettings,
  deleteRepositoryConnection,
  getRepositoryConnectionErrorMessage,
} from "./repositoryConnectionService";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const URL = "/company/1/environments/2/services/3/repository-connection";
const AUTH = { headers: { Authorization: "Bearer tok" } };

describe("repositoryConnectionService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getRepositoryConnection GETs the connection and unwraps data", async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: { id: 1 } } });
    await expect(getRepositoryConnection("1", 2, 3, "tok")).resolves.toEqual({ id: 1 });
    expect(mockedAxios.get).toHaveBeenCalledWith(URL, AUTH);
  });

  it("getRepositoryConnection returns null when none is connected", async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: null } });
    await expect(getRepositoryConnection("1", 2, 3, "tok")).resolves.toBeNull();
  });

  it("createRepositoryConnection POSTs the payload including the Bitbucket provider", async () => {
    const payload = { provider: "BITBUCKET" as const, owner: "ws", name: "repo", watchedBranch: "main" };
    mockedAxios.post.mockResolvedValue({ data: { data: { webhookSecret: "s" } } });
    await expect(createRepositoryConnection("1", 2, 3, payload, "tok")).resolves.toEqual({
      webhookSecret: "s",
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(URL, payload, AUTH);
  });

  it("rotateRepositoryConnectionSecret POSTs to /rotate-secret without a body", async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: { webhookSecret: "n" } } });
    await expect(rotateRepositoryConnectionSecret("1", 2, 3, "tok")).resolves.toEqual({
      webhookSecret: "n",
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(`${URL}/rotate-secret`, undefined, AUTH);
  });

  it("updateRepositoryConnectionTriggerSettings PUTs to /trigger-settings", async () => {
    mockedAxios.put.mockResolvedValue({ data: { data: { id: 1 } } });
    const payload = { triggerMode: "INSTANT" as const };
    await expect(updateRepositoryConnectionTriggerSettings("1", 2, 3, payload, "tok")).resolves.toEqual({
      id: 1,
    });
    expect(mockedAxios.put).toHaveBeenCalledWith(`${URL}/trigger-settings`, payload, AUTH);
  });

  it("deleteRepositoryConnection sends DELETE", async () => {
    mockedAxios.delete.mockResolvedValue({});
    await expect(deleteRepositoryConnection("1", 2, 3, "tok")).resolves.toBeUndefined();
    expect(mockedAxios.delete).toHaveBeenCalledWith(URL, AUTH);
  });

  describe("getRepositoryConnectionErrorMessage", () => {
    it("returns the API error message for axios errors", () => {
      mockedAxios.isAxiosError.mockReturnValue(true);
      const error = { response: { data: { error: "Already connected" } } };
      expect(getRepositoryConnectionErrorMessage(error, "fallback")).toBe("Already connected");
    });

    it("falls back when the axios error has no message", () => {
      mockedAxios.isAxiosError.mockReturnValue(true);
      expect(getRepositoryConnectionErrorMessage({ response: { data: {} } }, "fallback")).toBe("fallback");
      expect(getRepositoryConnectionErrorMessage({ response: { data: { error: "" } } }, "fallback")).toBe(
        "fallback",
      );
    });

    it("falls back for non-axios errors", () => {
      mockedAxios.isAxiosError.mockReturnValue(false);
      expect(getRepositoryConnectionErrorMessage(new Error("x"), "fallback")).toBe("fallback");
    });
  });
});
