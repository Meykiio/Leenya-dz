export interface PhoneValidationResult {
  valid: boolean
  normalized: string
  whatsappFormat: string
  errorCode?: 'invalid_prefix' | 'invalid_too_short' | 'invalid_too_long'
}

const ALGERIAN_PREFIXES = ['05', '06', '07']

export function validateAlgerianPhone(value: string): PhoneValidationResult {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("213") && digits.length === 12) {
    const rest = digits.slice(3)
    if (!ALGERIAN_PREFIXES.some(p => p === `0${rest[0]}`)) {
      return { valid: false, normalized: `0${rest}`, whatsappFormat: digits, errorCode: 'invalid_prefix' }
    }
    return { valid: true, normalized: `0${rest}`, whatsappFormat: digits }
  }

  if (digits.startsWith("0") && digits.length === 10) {
    if (!ALGERIAN_PREFIXES.some(p => digits.startsWith(p))) {
      return { valid: false, normalized: digits, whatsappFormat: `213${digits.slice(1)}`, errorCode: 'invalid_prefix' }
    }
    return { valid: true, normalized: digits, whatsappFormat: `213${digits.slice(1)}` }
  }

  if (digits.length >= 9 && !digits.startsWith("0") && !digits.startsWith("213")) {
    const normalized = `0${digits}`
    if (normalized.length !== 10) {
      return { valid: false, normalized, whatsappFormat: digits, errorCode: 'invalid_length' }
    }
    if (!ALGERIAN_PREFIXES.some(p => normalized.startsWith(p))) {
      return { valid: false, normalized, whatsappFormat: `213${digits}`, errorCode: 'invalid_prefix' }
    }
    return { valid: true, normalized, whatsappFormat: `213${digits}` }
  }

  if (digits.startsWith("0")) {
    return {
      valid: false, normalized: digits, whatsappFormat: digits,
      errorCode: digits.length < 10 ? 'invalid_too_short' : 'invalid_too_long'
    }
  }

  if (digits.startsWith("213")) {
    return {
      valid: false, normalized: digits, whatsappFormat: digits,
      errorCode: digits.length < 12 ? 'invalid_too_short' : 'invalid_too_long'
    }
  }

  return {
    valid: false, normalized: digits, whatsappFormat: digits,
    errorCode: digits.length < 9 ? 'invalid_too_short' : 'invalid_too_long'
  }
}

export function normalizePhoneForDB(value: string): string {
  const result = validateAlgerianPhone(value)
  return result.normalized
}

export function cleanPhone(phone: string): string {
  const result = validateAlgerianPhone(phone)
  return result.whatsappFormat
}
