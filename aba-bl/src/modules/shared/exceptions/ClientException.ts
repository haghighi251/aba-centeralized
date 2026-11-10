import {
  ApplicationException,
  ApplicationExceptionArguments,
} from './ApplicationException';
import { ServerType } from './ServiceException';

export class ClientException extends ApplicationException {
  serverType: ServerType;

  constructor(
    { message, data }: ApplicationExceptionArguments,
    serverType: ServerType,
  ) {
    super({ message, data });
    this.serverType = serverType;
  }
}

export class FactoryException extends ClientException {}
