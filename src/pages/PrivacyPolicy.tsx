import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-black mb-6 transition min-h-[44px]"
          data-testid="button-back"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <iframe
            src="https://app.termly.io/policy-viewer/policy.html?policyUUID=f6a26278-a117-4a06-adb1-4b7c55d655ca"
            className="w-full border-none"
            style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
            title="Privacy Policy"
          />
        </div>
      </div>
    </div>
  );
}
