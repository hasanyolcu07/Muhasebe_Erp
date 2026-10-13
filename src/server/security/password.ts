import { PublicError } from "./publicError";

/** Yeni şifreler için asgari kural. Mevcut hash doğrulamasında kullanılmaz. */
export function assertStrongPassword(password: string): void {
  if (password.length < 10) {
    throw new PublicError("Şifre en az 10 karakter olmalıdır.", 400);
  }
  if (!/[a-z]/.test(password)) {
    throw new PublicError("Şifre en az bir küçük harf içermelidir.", 400);
  }
  if (!/[A-Z]/.test(password)) {
    throw new PublicError("Şifre en az bir büyük harf içermelidir.", 400);
  }
  if (!/[0-9]/.test(password)) {
    throw new PublicError("Şifre en az bir rakam içermelidir.", 400);
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new PublicError("Şifre en az bir özel karakter içermelidir.", 400);
  }
}
