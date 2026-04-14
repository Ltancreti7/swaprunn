import { AddressFields } from '../../shared/schema';

export function formatAddress(address: AddressFields): string {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean);

  if (parts.length === 0) return '';

  const cityStatePart = [address.city, address.state].filter(Boolean).join(', ');
  const lastParts = [cityStatePart, address.zip].filter(Boolean).join(' ');

  return [address.street, lastParts].filter(Boolean).join(', ');
}

export function parseAddress(fullAddress: string): Partial<AddressFields> {
  if (!fullAddress || !fullAddress.trim()) {
    return {};
  }

  const trimmed = fullAddress.trim();

  const zipRegex = /\b(\d{5}(?:-\d{4})?)\b/;
  const zipMatch = trimmed.match(zipRegex);
  let zip = '';
  let remaining = trimmed;

  if (zipMatch) {
    zip = zipMatch[1];
    remaining = trimmed.replace(zipMatch[0], '').trim();
  }

  const stateRegex = /\b([A-Z]{2})\b/;
  const stateMatch = remaining.match(stateRegex);
  let state = '';

  if (stateMatch) {
    state = stateMatch[1];
    remaining = remaining.replace(stateMatch[0], '').trim();
  }

  const parts = remaining.split(',').map(p => p.trim()).filter(Boolean);

  let street = '';
  let city = '';

  if (parts.length >= 2) {
    city = parts[parts.length - 1];
    street = parts.slice(0, -1).join(', ');
  } else if (parts.length === 1) {
    street = parts[0];
  }

  return {
    street: street || '',
    city: city || '',
    state: state || '',
    zip: zip || '',
  };
}

export function validateZipCode(zip: string): boolean {
  if (!zip) return true;
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

export function formatZipCode(zip: string): string {
  const cleaned = zip.replace(/\D/g, '');

  if (cleaned.length <= 5) {
    return cleaned;
  }

  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
}

export function isAddressComplete(address: Partial<AddressFields>): boolean {
  return !!(
    address.street &&
    address.city &&
    address.state &&
    address.zip &&
    validateZipCode(address.zip)
  );
}
