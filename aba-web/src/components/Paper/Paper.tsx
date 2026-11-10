
import { SxProps } from '@mui/material';
import MuiPaper, { PaperProps } from '@mui/material/Paper';

export interface IPaperProps extends PaperProps {
    children: React.ReactNode;
    elevation?: number;
    sx?: SxProps;
}

const Paper = ({ children, elevation = 1, sx, ...props }: IPaperProps) => {
  return (
    <MuiPaper elevation={elevation} sx={sx} {...props}>
      {children}
    </MuiPaper>
  );
};
export default Paper;