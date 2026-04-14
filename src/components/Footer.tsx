import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-black text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img src="/swaprunn-logo-2025.png" alt="SwapRunn" className="h-20" />
          </div>
          <div className="flex space-x-6 text-sm">
            <button
              onClick={() => navigate('/terms-of-service')}
              className="hover:text-red-600 transition font-medium"
            >
              Terms of Service
            </button>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="hover:text-red-600 transition font-medium"
            >
              Privacy Policy
            </button>
            <a href="mailto:ltancreti7@gmail.com" className="hover:text-red-600 transition font-medium">Contact</a>
          </div>
        </div>
        <div className="text-center mt-4 text-sm text-gray-400">
          &copy; 2025 SwapRunn. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
