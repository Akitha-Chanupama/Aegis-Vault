export enum AegisErrorCode {
  UNAUTHENTICATED = "UNAUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  REVISION_CONFLICT = "REVISION_CONFLICT",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_ENVELOPE = "INVALID_ENVELOPE",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VAULT_ALREADY_INITIALIZED = "VAULT_ALREADY_INITIALIZED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  INTEGRITY_CHECK_FAILED = "INTEGRITY_CHECK_FAILED",
}

export class AegisError extends Error {
  constructor(
    public readonly code: AegisErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AegisError";
  }
}
