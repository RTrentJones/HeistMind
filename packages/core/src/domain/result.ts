// The Result envelope + error shapes every repository and use-case returns.
export interface DatabaseError {
  message: string;
  code?: string | undefined;
  details?: string | undefined;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type Result<T, E = DatabaseError> =
  | { success: true; data: T }
  | { success: false; error: E };
