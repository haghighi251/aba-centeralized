import { SelectChangeEvent } from "@mui/material";

export interface ISelectOption {
    value: string | number;
    label: string;
}

export interface ISelectBoxProps {
    name: string;
    labelText?: string;
    options: ISelectOption[];
    value?: string | number;
    defaultValue?: string | number;
    required?: boolean;
    disabled?: boolean;
    errorMessage?: string;
    onChange?: (event: SelectChangeEvent<string | number>, child: React.ReactNode) => void;
}