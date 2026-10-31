// Typed errors the API turns into clean JSON responses.

export interface ErrorDetail {
  path: string;
  message: string;
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: ErrorDetail[];

  constructor(status: number, message: string, code = 'error', details?: ErrorDetail[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** The AI service failed, timed out or answered badly. The message is safe to show to users. */
export class AiError extends HttpError {
  constructor(message: string, code = 'ai_unavailable', status = 503) {
    super(status, message, code);
  }
}
