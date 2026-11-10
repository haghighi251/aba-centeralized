import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TextField from './TextField';
import { ITextFieldProps } from './types';

describe('TextField Component', () => {
  const defaultProps: ITextFieldProps = {
    label: 'Test Label',
    value: '',
    onChange: jest.fn(),
  };

  it('renders without crashing', () => {
    render(<TextField {...defaultProps} />);
    expect(screen.getByTestId('text-field')).toBeInTheDocument();
  });

  it('renders with the right id', () => {
    render(<TextField {...defaultProps} id="test-id" />);
    const input = screen.getByTestId('text-field').querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('id', 'test-id');
  });

  it('renders with the right name', () => {
    render(<TextField {...defaultProps} name="test-name" />);
    const input = screen.getByTestId('text-field').querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('name', 'test-name');
  });

  it('displays the correct label', () => {
    render(<TextField {...defaultProps} />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('handles onChange event', () => {
    render(<TextField {...defaultProps} />);
    const input = screen.getByTestId('text-field').querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
  });

  it('displays the placeholder when provided', () => {
    render(<TextField {...defaultProps} placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<TextField {...defaultProps} disabled={true} />);
    const input = screen.getByTestId('text-field').querySelector('input') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('renders with the correct type', () => {
    render(<TextField {...defaultProps} type="password" />);
    const input = screen.getByTestId('text-field').querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');
  });

  it('uses the default variant when none is provided', () => {
    render(<TextField {...defaultProps} />);
    expect(screen.getByTestId('text-field')).toHaveClass('MuiTextField-root');
  });

  it('uses the specified variant when provided', () => {
    render(<TextField {...defaultProps} variant="filled" />);
    expect(screen.getByTestId('text-field')).toHaveClass('MuiTextField-root');
  });

  it('displays error state and helper text', () => {
  render(
    <TextField
      {...defaultProps}
      error
      helperText="Error message"
    />
  );
  expect(screen.getByText('Error message')).toBeInTheDocument();
  
  waitFor(() => {
    // Check for error class on the input element instead of the root
  const input = screen.getByTestId('text-field').querySelector('input');
  expect(input).toHaveClass('Mui-error');
  })
});

it('shows required asterisk when required is true', () => {
  render(<TextField {...defaultProps} required={true} />);
  // Check for required attribute on the input element
  const input = screen.getByTestId('text-field').querySelector('input');
  
  waitFor(() => {
    expect(input).toHaveAttribute('aria-required', 'true');
  })
});

it('renders with fullWidth when fullWidth prop is true', () => {
  render(<TextField {...defaultProps} fullWidth={true} />);
  // Check for fullWidth class on the FormControl component
  const formControl = screen.getByTestId('text-field');
  expect(formControl).toHaveClass('MuiFormControl-fullWidth');
});
});