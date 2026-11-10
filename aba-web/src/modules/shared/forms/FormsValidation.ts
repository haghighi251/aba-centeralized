const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:\.[a-zA-Z0-9-]{2,})+$/;

const hasNumbersRegexp = /^.*\d+.*$/;

const withIsString = (fn: (password: string) => boolean) => (password?: string) => {
    if (typeof password === 'string') {
        return fn(password);
    }

    return false;
};

export const hasMinLengthOf3 = withIsString((value: string) => value.length >= 3);

export const hasMinLengthOf6 = withIsString((value: string) => value.length >= 6);

export const hasMinLengthOf8 = withIsString((value: string) => value.length >= 8);

export const hasMaxLengthOf13 = withIsString((value: string) => value.length >= 8 && value.length <= 13);

export const hasMinLengthOf14 = withIsString((value: string) => value.length >= 14);

export const hasNumbers = withIsString(hasNumbersRegexp.test.bind(hasNumbersRegexp));

const hasSpecialCharsRegexp = /^.*[^A-Za-z0-9\söüäÖÜÄßẞ]+.*$/;

export const hasSpecialChars = withIsString(hasSpecialCharsRegexp.test.bind(hasSpecialCharsRegexp));

const hasLowerAndUppercaseLettersRegexp = /^(?=.*[a-zöüäß])(?=.*[A-ZÖÜÄẞ]).*$/;

export const hasLowerAndUppercaseLetters = withIsString(hasLowerAndUppercaseLettersRegexp.test.bind(hasLowerAndUppercaseLettersRegexp));

export const isNotEmpty = (value?: string) => {
    if (typeof value !== 'string') return false;

    return value.trim().length > 0;
};

export const isInputValid = (validationRegex: RegExp, value?: string) => {
    if (typeof value !== 'string') return false;

    return validationRegex.test(value);
};

export const isValidEmailAddress = (value?: string) => {
    if (typeof value !== 'string' || value.trim().length < 5) return false;

    return EMAIL_REGEX.test(value);
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const isValidUsername = (value?: string): boolean => {
  if (typeof value !== 'string') return false;
  
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 20) return false;
  
  return USERNAME_REGEX.test(trimmed);
};

// Simple regex for common URL validation (supports http://, https://, and optional www.)
// This matches most real-world URLs without being overly strict.
const WEBSITE_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

export const isValidWebsiteUrl = (value?: string): boolean => {
  if (typeof value !== 'string') return false;
  
  const trimmed = value.trim();
  // Match Zod's max(50) constraint
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  
  return WEBSITE_REGEX.test(trimmed);
};