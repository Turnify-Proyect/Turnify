export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
  errors: {
    code: string;
    statusCode: number;
    details?: string[];
  };
}
