export const validateVIN = (vin: string): { isValid: boolean; message: string } => {
  const cleanVIN = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');

  if (cleanVIN.length === 0) {
    return { isValid: false, message: '' };
  }

  if (cleanVIN.length !== 17) {
    return { isValid: false, message: 'VIN must be exactly 17 characters' };
  }

  if (/[IOQ]/.test(cleanVIN)) {
    return { isValid: false, message: 'VIN cannot contain I, O, or Q' };
  }

  return { isValid: true, message: 'Valid VIN' };
};

export const validateEmail = (email: string): { isValid: boolean; message: string } => {
  if (email.length === 0) {
    return { isValid: false, message: '' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true, message: '' };
};

export const validatePhone = (phone: string): { isValid: boolean; message: string } => {
  if (phone.length === 0) {
    return { isValid: false, message: '' };
  }

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10) {
    return { isValid: false, message: 'Phone number must be 10 digits' };
  }

  return { isValid: true, message: '' };
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

export const validatePassword = (password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  message: string;
} => {
  if (password.length === 0) {
    return { isValid: false, strength: 'weak', message: '' };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      strength: 'weak',
      message: 'Password must be at least 8 characters',
    };
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (criteriaCount >= 3 && password.length >= 12) {
    strength = 'strong';
  } else if (criteriaCount >= 2 && password.length >= 8) {
    strength = 'medium';
  }

  return {
    isValid: password.length >= 8,
    strength,
    message: strength === 'strong' ? 'Strong password' : strength === 'medium' ? 'Medium strength' : 'Weak password',
  };
};
