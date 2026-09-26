import { ApiError } from '../api/api-error';

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (Object.hasOwn(googleErrors, error.code)) return googleErrorMessage(error.code);
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

const googleErrors: Record<string, string> = {
  NETWORK_ERROR: 'เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองบันทึกอีกครั้ง',
  INTERNAL_SERVER_ERROR: 'ระบบไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
  UNIVERSITY_EMAIL_REQUIRED: 'กรุณาเลือกบัญชี @kmitl.ac.th, @mail.kmutt.ac.th หรือ @email.kmutnb.ac.th เท่านั้น',
  GOOGLE_CANCELLED: 'ยกเลิกการเข้าสู่ระบบแล้ว คุณสามารถเลือกบัญชี Google อีกครั้งได้',
  GOOGLE_SESSION_EXPIRED: 'การยืนยันตัวตนหมดอายุหรือใช้ไปแล้ว กรุณากด Google อีกครั้ง',
  GOOGLE_IDENTITY_INVALID: 'ไม่สามารถยืนยันบัญชี Google นี้ได้ กรุณาเลือกบัญชีมหาวิทยาลัยอีกครั้ง',
  GOOGLE_LOGIN_FAILED: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  GOOGLE_SESSION_FAILED: 'ไม่สามารถเริ่มเซสชันได้ กรุณาตรวจการเชื่อมต่อและอนุญาตคุกกี้ แล้วลองใหม่',
  GOOGLE_NOT_CONFIGURED: 'ระบบเข้าสู่ระบบด้วย Google ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
  GOOGLE_ACCOUNT_CONFLICT: 'อีเมลนี้เชื่อมกับบัญชี Google อื่นอยู่ กรุณาติดต่อผู้ดูแลระบบ',
  GOOGLE_LOGIN_REQUIRED: 'กรุณาเข้าสู่ระบบด้วยบัญชี Google ของมหาวิทยาลัย',
  ACCOUNT_INACTIVE: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
  PROFILE_INCOMPLETE: 'กรุณากรอกคณะและภาควิชาก่อนใช้งาน',
};

export function googleErrorMessage(code: string): string {
  return Object.hasOwn(googleErrors, code) ? googleErrors[code]! : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}
