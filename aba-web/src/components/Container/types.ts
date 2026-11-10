import { ContainerProps } from "@mui/material/Container";
import { Breakpoint } from "@mui/material/styles";
import { SxProps } from "@mui/material/styles";

export interface IContainerProps extends ContainerProps {
  children: React.ReactNode;
  maxWidth?: 	Breakpoint | false;
  sx?: SxProps;
}