import * as React from 'react';
import MuiBox from '@mui/material/Box';
import { IBoxProps } from './types';

export default function Box({
  children,
  sx = {},
  ...props
}: IBoxProps) {
  return (
    <MuiBox
    sx={sx}
      {...props}
    >
      {children}
    </MuiBox>
  );
}