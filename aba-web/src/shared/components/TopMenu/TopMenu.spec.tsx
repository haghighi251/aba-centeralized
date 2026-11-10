import { Session } from 'next-auth';
import * as nextAuthReact from 'next-auth/react';

import { render, screen } from '@testing-library/react';

import TopMenu from './TopMenu';
import { IAppBarProps } from '@/shared/types/components/appBar';

jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
    signOut: jest.fn(),
}));

jest.mock('@/shared/contexts/ThemeContext', () => ({
    useThemeContext: () => ({ mode: 'light', toggleTheme: jest.fn() }),
}));

jest.mock('@/components/AppBar/AppBar', () => ({
    __esModule: true,
    default: jest.fn(({ profileLabel, settings }: IAppBarProps) => (
        <div>
            <span data-testid="profile-label">{profileLabel ?? 'Guest'}</span>
            {settings.map((setting) => (
                <button key={setting.name} onClick={setting.onClick}>
                    {setting.name}
                </button>
            ))}
        </div>
    )),
}));

describe('TopMenu', () => {
    it('shows the user name and a logout setting when the user is signed in', () => {
        jest.spyOn(nextAuthReact, 'useSession').mockReturnValue({
            data: {
                user: {
                    name: 'John Doe',
                },
                expires: '',
            } as Session,
            status: 'authenticated',
            update: jest.fn(),
        });

        render(<TopMenu />);

        expect(screen.getByTestId('profile-label')).toHaveTextContent('John Doe');
        expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('shows a guest profile and no logout setting when the user is not signed in', () => {
        jest.spyOn(nextAuthReact, 'useSession').mockReturnValue({
            data: null,
            status: 'unauthenticated',
            update: jest.fn(),
        });

        render(<TopMenu />);

        expect(screen.getByTestId('profile-label')).toHaveTextContent('Guest');
        expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    });

    it('includes the company dashboard sections for a business owner', () => {
        jest.spyOn(nextAuthReact, 'useSession').mockReturnValue({
            data: {
                user: {
                    name: 'Jane Owner',
                    role: 'BUSINESS_OWNER',
                    companyId: 'company-1',
                } as Session['user'],
                expires: '',
            } as Session,
            status: 'authenticated',
            update: jest.fn(),
        });

        render(<TopMenu />);

        expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Business Details' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Teams' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Environments' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Users' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pricing & Plans' })).toBeInTheDocument();
    });

    it('hides the Users section for a business member without user-management rights', () => {
        jest.spyOn(nextAuthReact, 'useSession').mockReturnValue({
            data: {
                user: {
                    name: 'Sam Member',
                    role: 'BUSINESS_MEMBER',
                    companyId: 'company-1',
                } as Session['user'],
                expires: '',
            } as Session,
            status: 'authenticated',
            update: jest.fn(),
        });

        render(<TopMenu />);

        expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
    });

    it('includes the admin dashboard sections for a platform admin', () => {
        jest.spyOn(nextAuthReact, 'useSession').mockReturnValue({
            data: {
                user: {
                    name: 'Ada Admin',
                    role: 'SUPER_ADMIN',
                } as Session['user'],
                expires: '',
            } as Session,
            status: 'authenticated',
            update: jest.fn(),
        });

        render(<TopMenu />);

        expect(screen.getByRole('button', { name: 'Admin Dashboard' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Customer List' })).toBeInTheDocument();
    });
});
