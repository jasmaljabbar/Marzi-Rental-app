// Client-side mirror of the API's password policy (authService.assertPasswordPolicy),
// so people see the problem before submitting. The server remains the authority.
const COMMON = new Set(["password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "11111111", "iloveyou", "admin123", "letmein1", "welcome1"]);

export function passwordProblem(password: string, username?: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) return "That password is too easy to guess. Choose a less common one.";
  if (username && password.toLowerCase() === username.toLowerCase()) return "Password must not be the same as the username.";
  return null;
}

export function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
