export type ServiceErrorCode =
  | 'invalid_input'
  | 'invalid_amount'
  | 'invalid_limit'
  | 'no_default_limit'
  | 'not_found'
  | 'not_quick_entry'
  /** The entry exists but was logged from another kind of source. */
  | 'origin_mismatch'
  | 'missing_energy'
  /** g and ml are not converted to each other (LAS-02). */
  | 'incompatible_unit'
  | 'missing_serving'
  /** The food or meal has been (soft) deleted (OMA-06). */
  | 'deleted';

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
