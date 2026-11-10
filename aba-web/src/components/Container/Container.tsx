import React from 'react'
import MuiContainer from '@mui/material/Container';
import { IContainerProps } from './types'

const Container = ({ children, maxWidth = "lg", sx, ...props}: IContainerProps) => {
  return (<MuiContainer maxWidth={maxWidth} sx={sx} {...props}>
        {children}
      </MuiContainer>)
}

export default Container