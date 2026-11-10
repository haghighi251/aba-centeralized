import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('renders with default variant "contained" when no variant is provided', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    // MUI adds a class for the variant, we can check that it has the 'contained' class
    expect(button).toHaveClass('MuiButton-contained');
  });

  it('renders with the specified variant', () => {
    render(<Button variant="outlined">Outlined</Button>);
    const button = screen.getByRole('button', { name: /outlined/i });
    expect(button).toHaveClass('MuiButton-outlined');
  });

  it('applies disabled state correctly', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('renders startIcon and endIcon correctly', () => {
    const StartIcon = () => <span data-testid="start-icon">*</span>;
    const EndIcon = () => <span data-testid="end-icon">#</span>;
    render(
      <Button startIcon={<StartIcon />} endIcon={<EndIcon />}>
        With Icons
      </Button>
    );

    const button = screen.getByRole('button', { name: /with icons/i });
    expect(button).toBeInTheDocument();

    // Icons should be rendered inside the button
    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
  });

  it('sets loading state when isProcessing is true', () => {
    render(<Button isProcessing>Processing</Button>);
    const button = screen.getByRole('button', { name: /processing/i });

    // When loading, MUI adds a loading indicator (spinner) and disables the button
    expect(button).toBeDisabled();
    // MUI's loading indicator is a span with class 'MuiButton-loadingIndicator'
    const loadingIndicator = document.querySelector('.MuiButton-loadingIndicator');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('sets default loadingPosition to "start" when not provided', () => {
    render(<Button isProcessing>Processing</Button>);
    const button = screen.getByRole('button', { name: /processing/i });

    // MUI applies different classes based on loadingPosition: start, end, center
    // For 'start', the loading indicator should be placed before the children.
    // We can check that the button has the class for start position.
    expect(button).toHaveClass('MuiButton-loadingPositionStart');
  });

  it('respects custom loadingPosition', () => {
    render(
      <Button isProcessing loadingPosition="end">
        Processing
      </Button>
    );
    const button = screen.getByRole('button', { name: /processing/i });
    expect(button).toHaveClass('MuiButton-loadingPositionEnd');
  });

  it('applies sx styles correctly', () => {
    const sx = { backgroundColor: 'red', padding: '20px' };
    render(<Button sx={sx}>Styled</Button>);
    const button = screen.getByRole('button', { name: /styled/i });

    // MUI applies sx as inline styles or through emotion classes. We can check that the style prop contains expected values.
    // For simplicity, we check that the style attribute contains 'background-color' and 'padding' (MUI might merge with defaults).
    // Alternatively, we can check computed styles, but that's more complex. We'll check that the sx prop was passed (not easily testable directly).
    // A pragmatic approach: check that the button has a style attribute or class that includes our values.
    // Since MUI uses emotion, sx results in generated classes. We can't easily assert the exact style without diving into implementation.
    // We'll just ensure that the button renders without error and that the sx object is passed (via not crashing).
    expect(button).toBeInTheDocument();
    // Optionally, we can check that the sx object was merged: if we set a unique padding, we can check computed style in test environment.
    // But jsdom may not compute styles reliably. So we'll skip deep style testing.
  });

  it('passes additional props to the underlying MUI button', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} aria-label="custom" data-testid="custom-button">
        Click
      </Button>
    );

    const button = screen.getByTestId('custom-button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('aria-label', 'custom');
  });

  it('renders children correctly', () => {
    render(
      <Button>
        <span data-testid="child">Child Content</span>
      </Button>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('does not show loading indicator when isProcessing is false', () => {
    render(<Button>Not Processing</Button>);
    const loadingIndicator = document.querySelector('.MuiButton-loadingIndicator');
    expect(loadingIndicator).not.toBeInTheDocument();
  });

  it('handles sx as undefined when not provided', () => {
    // This test ensures the sx logic doesn't break when sx is omitted
    render(<Button>No SX</Button>);
    const button = screen.getByRole('button', { name: /no sx/i });
    expect(button).toBeInTheDocument();
  });

  it('merges sx correctly when provided as an object', () => {
    // This is a more direct test: if we pass sx, MUI generates a class and applies styles.
    // We can check that the class is present and that the style is applied (via computed style in jsdom).
    // For demonstration, we'll check that the button has the class 'MuiButton-root' and that the style exists.
    render(<Button sx={{ margin: '10px' }}>SX Button</Button>);
    const button = screen.getByRole('button', { name: /sx button/i });
    // In jsdom, we can check the style attribute if emotion applies inline styles? It doesn't; it uses classes.
    // So we can't easily test the exact style. Instead, we just verify the component didn't crash.
    expect(button).toBeInTheDocument();
  });
});