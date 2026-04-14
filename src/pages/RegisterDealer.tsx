import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Mail, Phone, Lock, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

export function RegisterDealer() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshAuth } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const checkPasswordStrength = (password: string) => {
    if (password.length < 6) return "weak";
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return "strong";
    }
    if (password.length >= 8 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) {
      return "medium";
    }
    return "weak";
  };

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength(checkPasswordStrength(password));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match. Please make sure both password fields are identical.");
      }

      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long for security.");
      }

      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`.trim();

      // Use the combined endpoint that creates user and dealer in one atomic request
      // This avoids cross-site cookie issues on production domains
      await api.auth.registerDealer({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        address: fullAddress,
        phone: formData.phone,
      });

      await refreshAuth();

      showToast("Registration successful! Welcome to SwapRunn.", "success");
      navigate("/dealer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register. Please try again.";
      if (message.includes("already exists")) {
        setError("This email is already registered. Please use the login page to access your account.");
      } else {
        setError(message);
      }
      console.error("Register dealer error:", err);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-gray-300 hover:text-red-400 mb-6 transition"
          data-testid="button-back"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 sm:px-8 sm:py-6">
            <div className="flex items-center justify-center mb-2">
              <Building2 size={32} className="text-white mr-3" />
              <h1 className="text-3xl font-bold text-white">
                Register Your Dealership
              </h1>
            </div>
            <p className="text-red-100 text-center text-sm">
              Join SwapRunn to streamline your vehicle logistics
            </p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-6 flex items-start" data-testid="error-message">
                <div className="flex-shrink-0 mr-3 mt-0.5">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Building2 size={16} className="inline mr-2 mb-1" />
                  Dealership Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Premium Auto Sales"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                  data-testid="input-name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MapPin size={16} className="inline mr-2 mb-1" />
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    data-testid="input-address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Los Angeles"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    data-testid="input-city"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CA"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value.toUpperCase() })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                      data-testid="input-state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="90210"
                      maxLength={5}
                      value={formData.zip}
                      onChange={(e) =>
                        setFormData({ ...formData, zip: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                      data-testid="input-zip"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Mail size={16} className="inline mr-2 mb-1" />
                    Business Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@dealership.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-2 mb-1" />
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Lock size={16} className="inline mr-2 mb-1" />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    data-testid="input-password"
                  />
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1">
                        <div className={`h-1.5 flex-1 rounded ${passwordStrength === "weak" ? "bg-red-500" : passwordStrength === "medium" ? "bg-yellow-500" : "bg-green-500"}`}></div>
                        <div className={`h-1.5 flex-1 rounded ${passwordStrength === "medium" || passwordStrength === "strong" ? passwordStrength === "medium" ? "bg-yellow-500" : "bg-green-500" : "bg-gray-200"}`}></div>
                        <div className={`h-1.5 flex-1 rounded ${passwordStrength === "strong" ? "bg-green-500" : "bg-gray-200"}`}></div>
                      </div>
                      <p className="text-xs mt-1 text-gray-600">
                        {passwordStrength === "weak" && "Weak - Add more characters and variety"}
                        {passwordStrength === "medium" && "Medium - Consider adding special characters"}
                        {passwordStrength === "strong" && "Strong password!"}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <CheckCircle2 size={16} className="inline mr-2 mb-1" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    data-testid="input-confirm-password"
                  />
                  {formData.confirmPassword && (
                    <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? "text-green-600" : "text-red-600"}`}>
                      {formData.password === formData.confirmPassword ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                    data-testid="checkbox-accept-terms"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-relaxed">
                    I agree to SwapRunn's{' '}
                    <button
                      type="button"
                      onClick={() => window.open('/terms-of-service', '_blank')}
                      className="text-red-600 hover:text-red-700 font-semibold underline"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => window.open('/privacy-policy', '_blank')}
                      className="text-red-600 hover:text-red-700 font-semibold underline"
                    >
                      Privacy Policy
                    </button>
                    . Your dealership information will be used to facilitate vehicle logistics and communication
                    with drivers and sales staff.
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                data-testid="button-submit"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Your Account...</span>
                  </span>
                ) : (
                  "Complete Registration"
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm">
                Already have a dealership account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-red-600 font-semibold hover:text-red-700 transition"
                  data-testid="link-login"
                >
                  Log in here
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Sales and drivers: Your dealership admin will add you to the roster
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
