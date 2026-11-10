export enum TextInputType {
    text = 'text',
    email = 'email',
    password = 'password',
    number = 'number',
    tel = 'tel',
    url = 'url',
    search = 'search',
}

export interface ITextBoxProps {
    name: string;
    type?: TextInputType;
    labelText?: string;
    placeholder?: string;
    value?: string;
    defaultValue?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    autoComplete?: string;
    icon?: string;
    addon?: string;
    className?: string;
    errorMessage?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}