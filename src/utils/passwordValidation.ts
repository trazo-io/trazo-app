/**
 * Enhanced Password Validation Utility
 * Implements OWASP 2025 password security guidelines for frontend validation
 * Mirrors backend validation for consistent user experience
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  entropy: number;
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minEntropy: number;
  checkSequential: boolean;
  checkCommonWords: boolean;
}

/**
 * Default password requirements following OWASP 2025 guidelines
 */
export const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8, // Matches backend EnhancedMinimumLengthValidator. Increase to 12 (OWASP) when backend is updated.
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minEntropy: 50,
  checkSequential: true,
  checkCommonWords: true
};

/**
 * Enhanced password validator class
 */
export class PasswordValidator {
  private requirements: PasswordRequirements;

  constructor(requirements: PasswordRequirements = DEFAULT_REQUIREMENTS) {
    this.requirements = requirements;
  }

  /**
   * Validate password against all requirements
   */
  public validate(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string }
  ): PasswordValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < this.requirements.minLength) {
      errors.push(`Password must be at least ${this.requirements.minLength} characters long`);
    } else {
      score += 20;
    }

    // Check character requirements
    if (this.requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (this.requirements.requireUppercase) {
      score += 15;
    }

    if (this.requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (this.requirements.requireLowercase) {
      score += 15;
    }

    if (this.requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (this.requirements.requireNumbers) {
      score += 15;
    }

    if (this.requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
    } else if (this.requirements.requireSpecialChars) {
      score += 15;
    }

    // Check entropy
    const entropy = this.calculateEntropy(password);
    if (entropy < this.requirements.minEntropy) {
      errors.push(
        'Password is too simple. Try making it longer or adding different character types.'
      );
    } else {
      score += 20;
    }

    // Check for sequential characters
    if (this.requirements.checkSequential && this.hasSequentialChars(password)) {
      warnings.push('Password contains sequential characters or keyboard patterns');
      score -= 10;
    }

    // Check for common words
    if (this.requirements.checkCommonWords && this.hasCommonWords(password)) {
      warnings.push('Password contains common words or predictable patterns');
      score -= 10;
    }

    // Check for personal information
    if (userInfo && this.containsPersonalInfo(password, userInfo)) {
      errors.push('Password cannot contain personal information');
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      entropy
    };
  }

  /**
   * Calculate password entropy
   */
  private calculateEntropy(password: string): number {
    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 18;
    if (/\s/.test(password)) charsetSize += 1;
    if (/[^\w\s!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 20;

    if (charsetSize === 0) return 0;

    return password.length * Math.log2(charsetSize);
  }

  /**
   * Check for sequential characters and keyboard patterns
   */
  private hasSequentialChars(password: string): boolean {
    const sequential = [
      '123',
      '234',
      '345',
      '456',
      '567',
      '678',
      '789',
      '890',
      'abc',
      'bcd',
      'cde',
      'def',
      'efg',
      'fgh',
      'ghi',
      'hij',
      'qwerty',
      'asdf',
      'zxcv',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];

    const lowerPassword = password.toLowerCase();
    return sequential.some(
      (seq) =>
        lowerPassword.includes(seq) || lowerPassword.includes(seq.split('').reverse().join(''))
    );
  }

  /**
   * Check for common words and patterns
   */
  private hasCommonWords(password: string): boolean {
    const commonWords = [
      'password',
      'pass',
      'admin',
      'user',
      'login',
      'welcome',
      'trazo',
      'farm',
      'agriculture',
      'carbon',
      'green',
      'eco',
      'company',
      'business',
      'office',
      'work',
      'home',
      'family'
    ];

    const lowerPassword = password.toLowerCase();
    return commonWords.some((word) => lowerPassword.includes(word));
  }

  /**
   * Check if password contains personal information
   */
  private containsPersonalInfo(
    password: string,
    userInfo: { email?: string; firstName?: string; lastName?: string }
  ): boolean {
    const lowerPassword = password.toLowerCase();

    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@');
      const username = emailParts[0];
      const domain = emailParts[1]?.split('.')[0];

      if (username.length >= 3 && lowerPassword.includes(username)) return true;
      if (domain && domain.length >= 3 && lowerPassword.includes(domain)) return true;
    }

    if (userInfo.firstName && userInfo.firstName.length >= 3) {
      if (lowerPassword.includes(userInfo.firstName.toLowerCase())) return true;
    }

    if (userInfo.lastName && userInfo.lastName.length >= 3) {
      if (lowerPassword.includes(userInfo.lastName.toLowerCase())) return true;
    }

    return false;
  }

  /**
   * Get password strength color for UI
   */
  public getStrengthColor(score: number, warnings: string[] = []): string {
    if (score < 20) return 'red.500';
    if (score < 40) return 'orange.500';
    if (score < 60) return 'yellow.500';
    // Colour follows the verdict (review of app #98): an open warning caps both at "Good".
    if (score < 80 || warnings.length > 0) return 'blue.500';
    return 'green.500';
  }

  /**
   * Get password strength label for UI
   */
  public getStrengthLabel(score: number, warnings: string[] = []): string {
    if (score < 20) return 'Very Weak';
    if (score < 40) return 'Weak';
    if (score < 60) return 'Fair';
    // One verdict (recordkeeping review F-20): a password with an open warning ("contains
    // common words") is never called Strong on the same screen.
    if (score < 80 || warnings.length > 0) return 'Good';
    return 'Strong';
  }
}

/**
 * Default validator instance
 */
export const passwordValidator = new PasswordValidator();

/**
 * Utility function for quick password validation
 */
export function validatePassword(
  password: string,
  userInfo?: { email?: string; firstName?: string; lastName?: string }
): PasswordValidationResult {
  return passwordValidator.validate(password, userInfo);
}

/**
 * Generate password requirements text for UI
 */
export function getPasswordRequirementsText(
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): string[] {
  const reqs: string[] = [];

  reqs.push(`At least ${requirements.minLength} characters long`);

  if (requirements.requireUppercase) reqs.push('One uppercase letter (A-Z)');
  if (requirements.requireLowercase) reqs.push('One lowercase letter (a-z)');
  if (requirements.requireNumbers) reqs.push('One number (0-9)');
  if (requirements.requireSpecialChars) reqs.push('One special character (!@#$%^&*(),.?":{}|<>)');

  reqs.push('No sequential characters or keyboard patterns');
  reqs.push('No common words or personal information');

  return reqs;
}

/**
 * Security audit function for password policies
 */
export const PasswordSecurityAudit = {
  /**
   * Audit password requirements for security compliance
   */
  auditRequirements(requirements: PasswordRequirements): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];

    if (requirements.minLength < 8) {
      issues.push('Minimum length should be at least 8 characters (OWASP: 12+ recommended)');
    }

    if (requirements.minLength < 12) {
      issues.push('Minimum length below OWASP 2025 recommendation of 12 characters');
    }

    if (!requirements.requireUppercase || !requirements.requireLowercase) {
      issues.push('Should require both uppercase and lowercase letters');
    }

    if (!requirements.requireNumbers) {
      issues.push('Should require at least one number');
    }

    if (!requirements.requireSpecialChars) {
      issues.push('Should require at least one special character');
    }

    if (requirements.minEntropy < 40) {
      issues.push('Minimum entropy should be at least 40 bits (OWASP: 50+ recommended)');
    }

    return {
      compliant: issues.length === 0,
      issues
    };
  }
};

/**
 * The validator's messages in the reader's language (settings audit leftover, 2026-11-12).
 *
 * `errors` and `warnings` above are English sentences, and several screens printed them as is, so a
 * Spanish reader got "Password contains common words or predictable patterns". Each sentence maps
 * to a catalogue id here, next to where it is written, so adding a message without copy fails
 * `passwordMessagesHaveCopy.test.ts`. Returns null for a sentence this table does not know.
 */
const PASSWORD_MESSAGE_IDS: Array<[RegExp, string]> = [
  [/^Password must be at least (\d+) characters long$/, 'auth.password.message.minLength'],
  [/^Password must contain at least one uppercase letter$/, 'auth.password.message.uppercase'],
  [/^Password must contain at least one lowercase letter$/, 'auth.password.message.lowercase'],
  [/^Password must contain at least one number$/, 'auth.password.message.number'],
  [/^Password must contain at least one special character/, 'auth.password.message.special'],
  [/^Password is too simple\./, 'auth.password.message.tooSimple'],
  [/^Password contains sequential characters/, 'auth.password.message.sequential'],
  [/^Password contains common words/, 'auth.password.message.commonWords'],
  [/^Password cannot contain personal information$/, 'auth.password.message.personalInfo']
];

export function passwordMessage(
  message: string
): { id: string; values: Record<string, string> } | null {
  for (const [pattern, id] of PASSWORD_MESSAGE_IDS) {
    const m = pattern.exec(message);
    if (m) return { id, values: m[1] ? { min: m[1] } : {} };
  }
  return null;
}

/**
 * The body of the "weak password" toast: the first refusal reason, in the reader's language, or
 * the generic line when no reason maps. One function for every screen that shows the toast (sign-up
 * and invitation setup), so the same refusal never reads two ways (review of app #378).
 */
export function weakPasswordToastBody(
  intl: { formatMessage: (d: { id: string }, v?: Record<string, string>) => string },
  errors: string[] | undefined
): string {
  for (const error of errors ?? []) {
    const known = passwordMessage(error);
    if (known) return intl.formatMessage({ id: known.id }, known.values);
  }
  return intl.formatMessage({ id: 'auth.signup.toast.weakPassword.body' });
}
