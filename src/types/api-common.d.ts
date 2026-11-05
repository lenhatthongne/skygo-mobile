// Global API types (no import/export, so every declaration is global). DTOs mirror skygo-backend.
declare namespace Api {
  interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
  }

  interface FieldError {
    field: string;
    message: string;
  }

  /** application/problem+json returned by the backend. */
  interface ProblemDetail {
    type?: string;
    title?: string;
    status: number;
    detail?: string;
    instance?: string;
    code?: string;
    errors?: FieldError[];
    retryAfterSeconds?: number;
  }
}
