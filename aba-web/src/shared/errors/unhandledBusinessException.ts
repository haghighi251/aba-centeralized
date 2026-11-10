import { ErrorMessage } from "../types/errors/errors";

export class UnhandledBusinessException extends Error {
    errorMessages: ErrorMessage[];

    constructor(messages: ErrorMessage[]) {
        super();
        this.errorMessages = messages;
    }
}