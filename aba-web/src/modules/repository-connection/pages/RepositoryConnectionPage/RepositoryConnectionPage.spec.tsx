import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RepositoryConnectionPage from "./RepositoryConnectionPage";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useRepositoryConnection } from "@/modules/repository-connection/hooks/useRepositoryConnection";
import { queryClient } from "@/components/ReactQueryProvider/ReactQueryProvider";

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("next/navigation", () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock("@/modules/repository-connection/hooks/useRepositoryConnection");
jest.mock("@/components/ReactQueryProvider/ReactQueryProvider", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock("@/modules/repository-connection/components/RepositoryConnectionCard/RepositoryConnectionCard", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="card">
      <span data-testid="canManage">{String(props.canManage)}</span>
      <span data-testid="token">{String(props.accessToken)}</span>
      <span data-testid="loading">{String(props.loading)}</span>
      <span data-testid="connection">{props.connection ? "set" : "null"}</span>
      <button onClick={props.onChanged as () => void}>changed</button>
    </div>
  ),
}));

const push = jest.fn();

function mockHooks(session: unknown, hook: Record<string, unknown> = {}) {
  (useSession as jest.Mock).mockReturnValue({ data: session });
  (useParams as jest.Mock).mockReturnValue({ id: "1", envId: "2", serviceId: "3" });
  (useRouter as jest.Mock).mockReturnValue({ push });
  (useRepositoryConnection as jest.Mock).mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    ...hook,
  });
}

function setup(role = "BUSINESS_OWNER", hook: Record<string, unknown> = {}) {
  mockHooks({ user: { role, tokens: { accessToken: "tok" } } }, hook);
  return render(<RepositoryConnectionPage />);
}

describe("RepositoryConnectionPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the heading and passes ids and token to the hook", () => {
    setup();
    expect(screen.getByText("Repository Connection")).toBeInTheDocument();
    expect(useRepositoryConnection).toHaveBeenCalledWith("1", 2, 3, "tok");
  });

  it.each([
    ["BUSINESS_OWNER", "true"],
    ["BUSINESS_ADMIN", "true"],
    ["BUSINESS_MEMBER", "false"],
    ["ADMIN", "false"],
  ])("sets canManage for role %s to %s", (role, expected) => {
    setup(role);
    expect(screen.getByTestId("canManage")).toHaveTextContent(expected);
  });

  it("passes the loading flag and a null connection when none exists", () => {
    setup("BUSINESS_OWNER", { isLoading: true });
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("connection")).toHaveTextContent("null");
  });

  it("passes the connection to the card", () => {
    setup("BUSINESS_OWNER", { data: { id: 1 } });
    expect(screen.getByTestId("connection")).toHaveTextContent("set");
  });

  it("shows the fetch error", () => {
    setup("BUSINESS_OWNER", { error: new Error("Network down") });
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("navigates back to the packages page", () => {
    setup();
    fireEvent.click(screen.getByLabelText("Back to packages"));
    expect(push).toHaveBeenCalledWith("/company/1/environments/2/services/3/packages");
  });

  it("invalidates the connection query when the card reports a change", () => {
    setup();
    fireEvent.click(screen.getByText("changed"));
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("uses an empty token and no manage rights without a session", () => {
    mockHooks(null);
    render(<RepositoryConnectionPage />);
    expect(screen.getByTestId("token")).toHaveTextContent("");
    expect(screen.getByTestId("canManage")).toHaveTextContent("false");
  });
});
