import { render } from "@testing-library/react";
import Container from "./Container";

describe("Container Component", () => {
  it("should render children correctly", () => {
    const { getByText } = render(
      <Container maxWidth="sm" sx={{ padding: 2 }}>
        <div>Test Child</div>
      </Container>
    );

    expect(getByText("Test Child")).toBeInTheDocument();
  });

  it("should apply maxWidth and sx props", () => {
    const { container } = render(
      <Container maxWidth="md" sx={{ backgroundColor: "lightblue" }}>
        <div>Styled Container</div>
      </Container>
    );
    expect(container.firstChild).toHaveStyle({
      backgroundColor: "lightblue"
    });

    // Check that the correct maxWidth class is applied
    expect(container.firstChild).toHaveClass('MuiContainer-maxWidthMd');
  });
});