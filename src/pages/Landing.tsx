import { Building2, UserCheck, Truck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white py-12 sm:py-16 md:py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              From Dealership to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-500">
                Driveway
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
              The complete platform connecting dealerships, sales teams, and drivers for seamless vehicle swaps and deliveries.
            </p>
          </div>

          {/* CTA Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
            {/* Dealership Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-gray-200 md:transform md:hover:-translate-y-2 transition-all flex flex-col">
              <div className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Building2 size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Dealership</h2>
              <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
                Start your free account and add your team members. Manage deliveries, drivers, and sales staff all in one place.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/register-dealer')}
                  className="touch-target w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3.5 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  data-testid="button-register-dealer"
                >
                  Register Dealership
                </button>
                <button
                  onClick={() => navigate('/login?type=dealer')}
                  className="touch-target w-full border-2 border-gray-300 text-gray-800 py-3.5 rounded-xl font-bold hover:border-gray-400 hover:bg-gray-50 transition-all"
                  data-testid="button-dealer-signin"
                >
                  Admin Sign In
                </button>
              </div>
            </div>

            {/* Sales Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-gray-200 md:transform md:hover:-translate-y-2 transition-all flex flex-col">
              <div className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <UserCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Sales Staff</h2>
              <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
                Join your dealership to request deliveries, track progress, and communicate with drivers.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/signup-sales')}
                  className="touch-target w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3.5 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  data-testid="button-sales-signup"
                >
                  Sign Up as Sales
                </button>
                <button
                  onClick={() => navigate('/login?type=sales')}
                  className="touch-target w-full border-2 border-gray-300 text-gray-800 py-3.5 rounded-xl font-bold hover:border-gray-400 hover:bg-gray-50 transition-all"
                  data-testid="button-sales-signin"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Driver Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-gray-200 md:transform md:hover:-translate-y-2 transition-all flex flex-col">
              <div className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Truck size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Driver Portal</h2>
              <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
                Sign up to connect with dealerships and start delivering vehicles in your area.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/signup-driver')}
                  className="touch-target w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3.5 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  data-testid="button-driver-signup"
                >
                  Sign Up as Driver
                </button>
                <button
                  onClick={() => navigate('/login?type=driver')}
                  className="touch-target w-full border-2 border-gray-300 text-gray-800 py-3.5 rounded-xl font-bold hover:border-gray-400 hover:bg-gray-50 transition-all"
                  data-testid="button-driver-signin"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
            Join the platform that's streamlining vehicle deliveries for dealerships across the country.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={() => navigate('/register-dealer')}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl md:transform md:hover:scale-105 inline-flex items-center justify-center text-lg touch-target"
              data-testid="button-cta-register-dealer"
            >
              Register Your Dealership
              <ArrowRight size={20} className="ml-2" />
            </button>
            <button
              onClick={() => navigate('/signup-driver')}
              className="w-full sm:w-auto bg-white text-neutral-900 px-8 py-4 rounded-xl font-bold hover:bg-neutral-100 transition-all shadow-lg hover:shadow-xl md:transform md:hover:scale-105 inline-flex items-center justify-center text-lg touch-target"
              data-testid="button-cta-driver-signup"
            >
              Sign Up as Driver
              <ArrowRight size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
