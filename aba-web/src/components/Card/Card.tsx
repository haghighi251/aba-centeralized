
import { SxProps } from '@mui/material';
import MuiCard, { CardProps } from '@mui/material/Card';

export interface ICardProps extends CardProps {
    children: React.ReactNode;
    sx?: SxProps;
}

const Card = ({ children, sx, ...props }: ICardProps) => {
  return (
    <MuiCard sx={sx} {...props}>
      {children}
    </MuiCard>
  );
};
export default Card;