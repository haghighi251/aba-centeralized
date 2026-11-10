import React from 'react';
import { Select as MuiSelect, MenuItem, FormControl, InputLabel, FormHelperText } from '@mui/material';
import { ISelectBoxProps } from './types';

const SelectBox: React.FC<ISelectBoxProps> = ({
    name,
    labelText,
    options,
    value,
    defaultValue,
    required,
    disabled,
    errorMessage,
    onChange,
}) => {
    return (
        <FormControl fullWidth variant="outlined" error={!!errorMessage}>
            {labelText && <InputLabel>{labelText}</InputLabel>}
            <MuiSelect
                name={name}
                value={value || ''}
                defaultValue={defaultValue || ''}
                required={required}
                disabled={disabled}
                onChange={onChange}
                label={labelText}
            >
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </MuiSelect>
            {errorMessage && <FormHelperText>{errorMessage}</FormHelperText>}
        </FormControl>
    );
};

export default SelectBox;