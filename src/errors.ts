export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidProfileUrlError extends AppError {
  constructor(message: string, detail?: string) {
    super("INVALID_PROFILE_URL", message, 400, detail);
  }
}

export class ProfileNotFoundError extends AppError {
  constructor(vanity: string, detail?: string) {
    super(
      "PROFILE_NOT_FOUND",
      `Unable to get LinkedIn profile: no profile found for '${vanity}'`,
      404,
      detail,
    );
  }
}

export class ProfileNotAccessibleError extends AppError {
  constructor(vanity: string, detail?: string) {
    super(
      "PROFILE_NOT_ACCESSIBLE",
      `Unable to get LinkedIn profile: profile '${vanity}' is private, out of network, or inaccessible`,
      403,
      detail,
    );
  }
}

export class SessionExpiredError extends AppError {
  constructor(detail?: string) {
    super("SESSION_EXPIRED", "The LinkedIn session is no longer valid", 502, detail);
  }
}

export class SessionUnavailableError extends AppError {
  constructor() {
    super("SESSION_UNAVAILABLE", "No LinkedIn session is configured", 503);
  }
}

export class RateLimitedError extends AppError {
  constructor(detail?: string) {
    super("RATE_LIMITED", "Rate limit exceeded", 429, detail);
  }
}

export class LinkedInBlockedError extends AppError {
  constructor(detail?: string) {
    super("LINKEDIN_BLOCKED", "LinkedIn blocked or challenged this request", 502, detail);
  }
}

export class ParseError extends AppError {
  constructor(detail?: string) {
    super("PARSE_ERROR", "Failed to parse LinkedIn response", 502, detail);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("UNAUTHORIZED", "Missing or invalid API key", 401);
  }
}
