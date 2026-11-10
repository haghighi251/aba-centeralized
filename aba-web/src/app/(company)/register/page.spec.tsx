import { render, screen } from '@testing-library/react';
import Page from './page';

jest.mock('@/modules/company/pages/RegisterPage/RegisterPage', () => {
  return function DummyRegisterPage() {
    return <div>RegisterPage</div>;
  };
});

describe('Register page', () => {
  it('should render the register page within the base layout', async () => {
    const ui = await Page();
    render(ui);

    expect(screen.getByText('RegisterPage')).toBeInTheDocument();
  });
});
