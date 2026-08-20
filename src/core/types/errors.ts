/**
 * RFC 7807 Problem Details Error Representation
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  timestamp: string;
  invalidParams?: Array<{
    name: string;
    reason: string;
  }>;
}

export class CinelyError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly type: string;
  public readonly invalidParams?: Array<{ name: string; reason: string }>;

  constructor(options: {
    message: string;
    code: string;
    status?: number;
    type?: string;
    invalidParams?: Array<{ name: string; reason: string }>;
  }) {
    super(options.message);
    this.name = "CinelyError";
    this.code = options.code;
    this.status = options.status || 500;
    this.type = options.type || `https://api.cinely.io/errors/${options.code}`;
    this.invalidParams = options.invalidParams;
  }

  public toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.message,
      status: this.status,
      detail: this.message,
      instance,
      code: this.code,
      timestamp: new Date().toISOString(),
      invalidParams: this.invalidParams
    };
  }
}

export class NotFoundError extends CinelyError {
  constructor(entity: string, id: string) {
    super({
      message: `${entity} '${id}' was not found.`,
      code: "RESOURCE_NOT_FOUND",
      status: 404
    });
  }
}

export class ValidationError extends CinelyError {
  constructor(message: string, invalidParams?: Array<{ name: string; reason: string }>) {
    super({
      message,
      code: "VALIDATION_FAILED",
      status: 400,
      invalidParams
    });
  }
}

export class AddonTimeoutError extends CinelyError {
  constructor(addonId: string, timeoutMs: number) {
    super({
      message: `Addon '${addonId}' timed out after ${timeoutMs}ms.`,
      code: "ADDON_TIMEOUT",
      status: 504
    });
  }
}

export class AddonCircuitOpenError extends CinelyError {
  constructor(addonId: string) {
    super({
      message: `Addon '${addonId}' circuit breaker is OPEN due to high error rates.`,
      code: "ADDON_CIRCUIT_OPEN",
      status: 503
    });
  }
}

export class SSRFViolationError extends CinelyError {
  constructor(host: string, ip: string) {
    super({
      message: `Outbound request to ${host} (${ip}) was blocked by SSRF defense firewall.`,
      code: "SSRF_VIOLATION",
      status: 403
    });
  }
}

export class InvalidCredentialsError extends CinelyError {
  constructor() {
    super({
      message: "Email or password is incorrect.",
      code: "INVALID_CREDENTIALS",
      status: 401
    });
  }
}

export class EmailAlreadyExistsError extends CinelyError {
  constructor() {
    super({
      message: "An account with this email address already exists.",
      code: "EMAIL_ALREADY_EXISTS",
      status: 409
    });
  }
}

export class RefreshTokenInvalidError extends CinelyError {
  constructor() {
    super({
      message: "The refresh token is invalid, expired, or has already been rotated.",
      code: "REFRESH_TOKEN_INVALID",
      status: 401
    });
  }
}

export class UnauthorizedError extends CinelyError {
  constructor(detail?: string) {
    super({
      message: detail || "Authentication required or token expired.",
      code: "UNAUTHORIZED",
      status: 401
    });
  }
}
