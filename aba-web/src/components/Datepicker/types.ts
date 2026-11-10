export interface IDatepickerProps {
    name: string;
    labelText?: string;
    title?: string;
    value?: Date;
    defaultValue?: Date;
    required?: boolean;
    disabled?: boolean;
    errorMessage?: string;
    onChange?: (date: Date | null) => void;
}