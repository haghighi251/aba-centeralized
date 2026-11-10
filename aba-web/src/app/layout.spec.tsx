import { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

import RootLayout, { generateMetadata } from './layout';
import { getServerTranslations } from '@/shared/utils/i18n/server';

jest.mock('@/shared/utils/i18n/server', () => ({
  getServerTranslations: jest.fn(),
}));

jest.mock('@/components/ReactQueryProvider/ReactQueryProvider', () => {
  return function DummyReactQueryProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock('@/components/SessionProvider/SessionProvider', () => {
  return function DummySessionProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock('@/shared/components/ClientProviders/ClientProviders', () => {
  return function DummyClientProviders({ children }: { children: ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock('@/shared/components/TopMenu/TopMenu', () => {
  return function DummyTopMenu() {
    return <div>TopMenu</div>;
  };
});

const mockGetServerTranslations = getServerTranslations as jest.Mock;

describe('RootLayout', () => {
  beforeEach(() => {
    mockGetServerTranslations.mockResolvedValue({
      t: (key: string) => key,
      i18n: { resolvedLanguage: 'en' },
    });
  });

  it('returns metadata with the translated title and description', async () => {
    const metadata = await generateMetadata();

    expect(metadata.title).toBe('metadata_title');
    expect(metadata.description).toBe('metadata_description');
  });

  it('renders the html document with the resolved language and direction', async () => {
    const ui = await RootLayout({ session: null, children: <div>Test child</div> });

    expect(ui.props.lang).toBe('en');
    expect(ui.props.dir).toBe('ltr');

    render(ui);

    expect(screen.getByText('TopMenu')).toBeInTheDocument();
    expect(screen.getByText('Test child')).toBeInTheDocument();
  });

  it('resolves rtl direction for right-to-left languages', async () => {
    mockGetServerTranslations.mockResolvedValue({
      t: (key: string) => key,
      i18n: { resolvedLanguage: 'fa' },
    });

    const ui = await RootLayout({ session: null, children: <div>Test child</div> });

    expect(ui.props.lang).toBe('fa');
    expect(ui.props.dir).toBe('rtl');
  });
});
