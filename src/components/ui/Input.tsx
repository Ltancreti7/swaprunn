import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
}

export function Input({ label, error, success, hint, className = '', onFocus, onBlur, ...props }: InputProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          {...props}
          onFocus={(event) => onFocus?.(event)}
          onBlur={(event) => onBlur?.(event)}
          className={`w-full px-4 py-2 border rounded-lg transition-all ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              : success
              ? 'border-green-500 focus:ring-2 focus:ring-green-500 focus:border-transparent'
              : 'border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent'
          } ${className}`}
        />
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertCircle size={20} className="text-red-500" />
          </div>
        )}
        {success && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle size={20} className="text-green-500" />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-1 text-sm text-green-600">{success}</p>}
      {hint && !error && !success && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  rows?: number;
}

export function TextArea({ label, error, hint, rows = 3, className = '', ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <textarea
        {...props}
        rows={rows}
        className={`w-full px-4 py-2 border rounded-lg transition-all resize-none ${
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
            : 'border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent'
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
