const LOCAL_EIGHT_DIGIT_PHONE = /^\d{4}[- ]?\d{4}$/
const INTERNATIONAL_PHONE = /^(?:\+\d[\d\s().-]{6,19}|\(\d{2,4}\)[\d\s.-]{4,16})$/

export const PHONE_ERROR_MESSAGE =
  'Usa un teléfono válido, por ejemplo 88888888 o 8888-8888.'

export function trimPhone(
  value: FormDataEntryValue | string | null | undefined
) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizePhoneForComparison(value: string) {
  return value.replace(/\D/g, '')
}

export function isValidPhone(
  value: string,
  options: { required?: boolean } = {}
) {
  const phone = trimPhone(value)

  if (!phone) {
    return !options.required
  }

  if (LOCAL_EIGHT_DIGIT_PHONE.test(phone)) {
    return true
  }

  if (!INTERNATIONAL_PHONE.test(phone)) {
    return false
  }

  const digits = normalizePhoneForComparison(phone)
  return digits.length >= 7 && digits.length <= 15
}

export function validatePhone(
  value: string,
  options: { required?: boolean } = {}
) {
  const phone = trimPhone(value)

  if (!isValidPhone(phone, options)) {
    return { ok: false as const, error: PHONE_ERROR_MESSAGE }
  }

  return { ok: true as const, value: phone }
}