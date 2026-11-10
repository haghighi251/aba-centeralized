import {
  ApplicationException,
  ApplicationExceptionArguments,
} from './ApplicationException';

export enum ServerType {
  FACT_FINDER = 'FACT_FINDER',
  HYBRIS = 'HYBRIS',
  TELECLINIC = 'TELECLINIC',
  SUPER_PIM = 'SUPER_PIM',
  HELIX_SERVICE_LAYER = 'HELIX_SERVICE_LAYER',
  CRITEO = 'CRITEO',
  RX_SERVICE_HOOK = 'RX_SERVICE_HOOK',
}
export class ServerException extends ApplicationException {
  serverType: ServerType;

  constructor(
    { message, data }: ApplicationExceptionArguments,
    serverType: ServerType,
  ) {
    super({ message, data });
    this.serverType = serverType;
  }
}
