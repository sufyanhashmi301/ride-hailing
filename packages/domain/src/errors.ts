export type DomainErrorCode = "INVALID_TRANSITION";

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
}
