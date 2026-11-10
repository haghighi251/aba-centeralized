// @ts-nocheck
import { useTranslation } from 'react-i18next';

import TextBox from '@/components/TextBox/TextBox';

function isValidEmailAddress(email?: string): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPasswordValid(password?: string): boolean {
  return !!password && password.length >= 8;
}

type Props = { wasSubmitted?: boolean; username?: string; disableEmail?: boolean };

enum Fields {
    Email = 'email',
    Password = 'password'
}

export const LoginInformation = ({ wasSubmitted, username, disableEmail }: Props) => {
    const { t } = useTranslation('user');

    return (
        <>
            <h5 className="mb-4 flex items-center font-semibold text-grey-1">{t('login_information')}</h5>
            <div className="grid-col grid gap-3">
                <TextBox name={Fields.Email} wasSubmitted={wasSubmitted} defaultValue={username} readOnly={disableEmail} />
                <TextBox name={Fields.Password} wasSubmitted={wasSubmitted} />
            </div>
        </>
    );
};

export type FieldValues = {
    [Key in Fields]: string;
};

LoginInformation.isValid = (values: Partial<FieldValues>): values is FieldValues => {
    return isValidEmailAddress(values.email) && isPasswordValid(values.password);
};
