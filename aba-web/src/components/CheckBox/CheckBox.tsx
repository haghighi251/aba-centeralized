import React from 'react';
import { Checkbox, CheckboxProps, FormControlLabel, FormControl, FormHelperText } from '@mui/material';

export interface ICustomCheckBoxProps extends CheckboxProps {
    name?: string;
    labelText?: React.ReactNode;
    disabled?: boolean;
    required?: boolean;
    errorMessage?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CheckBox: React.FC<ICustomCheckBoxProps> = ({
    name,
    labelText,
    disabled = false,
    required = false,
    errorMessage,
    onChange,
    ...props
}) => {
    const checkbox = <Checkbox {...props} name={name} disabled={disabled} required={required} onChange={onChange} />;

    if (labelText) {
        return (
            <FormControl error={!!errorMessage}>
                <FormControlLabel
                    control={checkbox}
                    label={labelText}
                    disabled={disabled}
                    required={required}
                />
                {errorMessage && <FormHelperText>{errorMessage}</FormHelperText>}
            </FormControl>
        );
    }

    return checkbox;
};

export default CheckBox;