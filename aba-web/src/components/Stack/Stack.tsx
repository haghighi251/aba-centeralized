
import MuiStack, { StackProps } from '@mui/material/Stack';

export interface IStackProps extends StackProps {
    children: React.ReactNode;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    alignment?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    spacing?: number;
}

const Stack = ({ children, direction = 'column', spacing = 2, alignment = 'stretch', justifyContent = 'flex-start', ...props }: IStackProps) => {
  return (
    <MuiStack direction={direction} spacing={spacing} alignItems={alignment} justifyContent={justifyContent} {...props}>
      {children}
    </MuiStack>
  );
};
export default Stack;