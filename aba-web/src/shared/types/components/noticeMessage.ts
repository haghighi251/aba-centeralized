export type NoticeMessage = {
    severity: Severity;
    message: string;
    translationParams?: Record<string, string>;
};

export enum Severity {
    Success = 'SUCCESS',
    Warning = 'WARNING',
    Error = 'ERROR'
}