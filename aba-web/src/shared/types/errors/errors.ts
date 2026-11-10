import { Severity } from "@/shared/types/components/noticeMessage";


export type ErrorMessage = {
    severity: Severity;
    message: string;
};