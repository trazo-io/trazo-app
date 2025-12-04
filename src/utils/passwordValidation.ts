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
  minLength: 12,
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
        `Password complexity is too low (${entropy.toFixed(
          1
        )} bits). Use more character types or increase length.`
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
  public getStrengthColor(score: number): string {
    if (score < 20) return 'red.500';
    if (score < 40) return 'orange.500';
    if (score < 60) return 'yellow.500';
    if (score < 80) return 'blue.500';
    return 'green.500';
  }

  /**
   * Get password strength label for UI
   */
  public getStrengthLabel(score: number): string {
    if (score < 20) return 'Very Weak';
    if (score < 40) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 80) return 'Good';
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
