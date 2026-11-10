type ApplicationExceptionData = Record<string, unknown>;

export type ApplicationExceptionArguments = {
  message: string;
  data: ApplicationExceptionData;
};
export abstract class ApplicationException extends Error {
  message: string;
  data: ApplicationExceptionData;

  constructor({ message, data }: ApplicationExceptionArguments) {
    super(message);
    this.message = message;
    this.data = data;
  }
  toJSON() {
    return {
      message: this.message,
      data: this.data,
    };
  }
}
