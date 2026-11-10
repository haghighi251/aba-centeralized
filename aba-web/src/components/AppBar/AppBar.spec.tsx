import { useRouter } from "next/navigation";
import { fireEvent, render, screen } from "@testing-library/react";

import AppBar from "./AppBar";
import { IAppBarProps } from "@/shared/types/components/appBar";

jest.mock("@/shared/components/LanguageSwitcher/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div>LanguageSwitcher</div>,
}));

const baseProps: IAppBarProps = {
  logoText: "Logo",
  logoPath: "/",
  pages: [{ name: "Home", path: "/" }],
  settings: [
    { name: "Dashboard", path: "/company/1" },
    { name: "Logout", path: "#", onClick: jest.fn() },
  ],
  settingsTitle: "Settings",
  profile: { title: "Jane Doe", avatar: "" },
  profileLabel: "Jane Doe",
};

describe("AppBar", () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it("navigates via router.push when a top-nav page is clicked", () => {
    render(<AppBar {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("navigates via router.push when a profile menu item with a path is clicked", () => {
    render(<AppBar {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: baseProps.settingsTitle }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Dashboard" }));

    expect(mockPush).toHaveBeenCalledWith("/company/1");
  });

  it("calls onClick instead of navigating when a profile menu item defines one", () => {
    render(<AppBar {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: baseProps.settingsTitle }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(baseProps.settings[1].onClick).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
