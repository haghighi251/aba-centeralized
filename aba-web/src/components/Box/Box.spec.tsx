import { render, screen } from "@testing-library/react";
import Box from "./Box";

describe("Box Component", () => {
  it("renders without crashing", () => {
    const { container } = render(<Box>Test</Box>);

    expect(container).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("applies custom styles", () => {
    const { getByText } = render(
      <Box sx={{ backgroundColor: 'red' }}>Styled Box</Box>
    );

    const box = getByText('Styled Box');
    expect(box).toHaveStyle('background-color: red');
  });

  it("passes additional props to MUI Box", () => {
    const { getByText } = render(
      <Box data-testid="test-box">Test Props</Box>
    );
    
    const box = getByText('Test Props');
    expect(box).toHaveAttribute('data-testid', 'test-box');
  });
}
);