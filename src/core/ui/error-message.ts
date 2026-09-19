import { ApiError } from '../api/api-error';

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      return 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
    }
    if (error.code === 'EMAIL_IN_USE') {
      return 'อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น';
    }
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    }
    if (error.code === 'VALIDATION_ERROR' && error.details && typeof error.details === 'object') {
      const details = error.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
      if (details.fieldErrors) {
        const firstKey = Object.keys(details.fieldErrors)[0];
        const msg = firstKey ? details.fieldErrors[firstKey]?.[0] : undefined;
        if (msg) {
          return `${firstKey}: ${msg}`;
        }
      }
      if (details.formErrors?.[0]) {
        return details.formErrors[0];
      }
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
}
