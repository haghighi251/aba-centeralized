import { TextFieldVariants } from '@mui/material';

export interface ITextFieldProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  variant?: TextFieldVariants;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  size?: "small" | "medium";
  multiline?: boolean;
  rows?: number;
  inputProps?: Record<string, unknown>;
  InputProps?: Record<string, unknown>;
  sx?: Record<string, unknown>;
}