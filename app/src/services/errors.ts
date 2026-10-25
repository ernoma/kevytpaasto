export type ServiceErrorCode =
  | 'invalid_input'
  | 'invalid_amount'
  | 'invalid_limit'
  | 'no_default_limit'
  | 'not_found'
  | 'not_quick_entry';

/** An expected failure the UI can map to a message. Programming errors are not wrapped. */
export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
