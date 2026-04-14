import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { AddressFields } from '../../../shared/schema';
import { US_STATES } from '../../lib/usStates';
import { validateZipCode, formatZipCode } from '../../lib/addressUtils';

interface AddressInputProps {
  label: string;
  value: AddressFields;
  onChange: (address: AddressFields) => void;
  required?: boolean;
  disabled?: boolean;
}

export function AddressInput({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: AddressInputProps) {
  const [zipError, setZipError] = useState('');

  useEffect(() => {
    if (value.zip && value.zip.length > 0) {
      if (!validateZipCode(value.zip)) {
        setZipError('Invalid ZIP code format (use 12345 or 12345-6789)');
      } else {
        setZipError('');
      }
    } else {
      setZipError('');
    }
  }, [value.zip]);

  const handleZipChange = (newZip: string) => {
    const cleaned = newZip.replace(/\D/g, '');
    if (cleaned.length <= 9) {
      onChange({ ...value, zip: formatZipCode(cleaned) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-5 h-5 text-gray-600" />
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Street Address
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
        <input
          type="text"
          required={required}
          disabled={disabled}
          placeholder="Enter your complete street address manually (e.g., 123 Main Street)"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="address-line1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
          <input
            type="text"
            required={required}
            disabled={disabled}
            placeholder="Boston"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoComplete="address-level2"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
          <select
            required={required}
            disabled={disabled}
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow shadow-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoComplete="address-level1"
          >
            <option value="">Select State</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name} ({state.code})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
          <input
            type="text"
            required={required}
            disabled={disabled}
            placeholder="12345"
            value={value.zip}
            onChange={(e) => handleZipChange(e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${
              zipError ? 'border-red-500' : 'border-gray-300'
            }`}
            autoComplete="postal-code"
          />
          {zipError && (
            <p className="text-xs text-red-600 mt-1">{zipError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
