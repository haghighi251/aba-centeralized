export type AppBarPage = {
    name: string;
    path: string;
};

export type AppBarSetting = {
    name: string;
    path: string;
    onClick?: () => void;
};

export type AppBarProfile = {
    title: string;
    avatar: string;
}

export interface IAppBarProps {
    logoText: string;
    logoPath: string;
    pages: AppBarPage[];
    settings: AppBarSetting[];
    settingsTitle: string;
    profile: AppBarProfile;
    profileLabel?: string;
    actionProps?: {
        handleOpenNavMenu: () => void;
        handleOpenUserMenu: () => void;
        handleCloseNavMenu: () => void;
        handleCloseUserMenu: () => void;
    };
};