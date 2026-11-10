import MuiGrid, { GridProps } from '@mui/material/Grid';

export interface IGridProps extends GridProps {
    children: React.ReactNode;
    container?: boolean;
    item?: boolean;
}

const Grid = ({ children, container, item, ...props }: IGridProps) => {
  return (
    <MuiGrid {...(container && { container })} {...(item && { item })} {...props}>
      {children}
    </MuiGrid>
  );
};
export default Grid;