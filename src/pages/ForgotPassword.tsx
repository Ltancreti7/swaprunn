import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { validateEmail } from '../lib/validation';
import { Input } from '../components/ui/Input';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/email-configured')
      .then(res => res.json())
      .then(data => setEmailConfigured(data.configured))
      .catch(() => setEmailConfigured(false));
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value.length > 0) {
      const validation = validateEmail(value);
      setEmailError(validation.isValid ? '' : validation.message);
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.message);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setEmailSent(true);
      showToast(data.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to process request', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4" data-testid="forgot-password-success">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-success-title">Check Your Email</h2>
            <p className="text-gray-600 mb-6" data-testid="text-success-message">
              {emailConfigured 
                ? "If an account exists with this email, you'll receive a password reset link shortly."
                : "Your request has been received. However, email service is not currently configured. Please contact support for assistance."}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              data-testid="button-back-to-login"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4" data-testid="forgot-password-page">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center text-gray-600 hover:text-red-600 mb-6 transition"
          data-testid="link-back"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Login
        </button>

        <h2 className="text-3xl font-bold mb-2">Forgot Password?</h2>
        <p className="text-gray-600 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {emailConfigured === false && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6" data-testid="warning-email-not-configured">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-yellow-800">
                  Email service is currently being set up. You can still submit this form and we'll process your request.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            error={emailError}
            placeholder="you@example.com"
            required
            data-testid="input-email"
          />

          <button
            type="submit"
            disabled={loading || !!emailError}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            data-testid="button-submit"
          >
            {loading ? 'Processing...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
