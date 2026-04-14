import { Building2, UserCheck, Truck, CheckCircle2, MessageSquare, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HowItWorks() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">How SwapRunn Works</h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Simple, streamlined vehicle delivery management in three steps
          </p>
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="relative group">
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 rounded-2xl border-2 border-gray-200 hover:border-red-600 transition-all shadow-lg hover:shadow-xl md:transform md:hover:-translate-y-2">
                <div className="bg-gradient-to-br from-red-600 to-red-700 text-white w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <div className="text-3xl font-bold">1</div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Dealerships Register</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create your dealership account, invite your sales team, and approve drivers who want to work with you.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 rounded-2xl border-2 border-gray-200 hover:border-red-600 transition-all shadow-lg hover:shadow-xl md:transform md:hover:-translate-y-2">
                <div className="bg-gradient-to-br from-red-600 to-red-700 text-white w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <div className="text-3xl font-bold">2</div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Sales Request Deliveries</h3>
                <p className="text-gray-600 leading-relaxed">
                  Sales staff submit delivery requests with vehicle details, pickup and dropoff locations, and timeframes.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 rounded-2xl border-2 border-gray-200 hover:border-red-600 transition-all shadow-lg hover:shadow-xl md:transform md:hover:-translate-y-2">
                <div className="bg-gradient-to-br from-red-600 to-red-700 text-white w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <div className="text-3xl font-bold">3</div>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Drivers Deliver</h3>
                <p className="text-gray-600 leading-relaxed">
                  Drivers accept requests, coordinate schedules via chat, and complete deliveries efficiently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for dealerships, sales teams, and drivers
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Real-Time Chat</h3>
              <p className="text-gray-600 text-base sm:text-sm">
                Direct communication between sales staff and drivers with instant notifications.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Calendar size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Scheduling</h3>
              <p className="text-gray-600 text-base sm:text-sm">
                Coordinate delivery times with visual calendar and automated confirmations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MapPin size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Location Tracking</h3>
              <p className="text-gray-600 text-base sm:text-sm">
                Full pickup and dropoff address management with structured location data.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Status Updates</h3>
              <p className="text-gray-600 text-base sm:text-sm">
                Track deliveries from request to completion with real-time status updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Benefits */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">Built for Everyone</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Tailored experiences for each role in your delivery workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-2xl shadow-xl border-2 border-red-100">
              <div className="bg-gradient-to-br from-red-600 to-red-700 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Building2 size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">For Dealerships</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Centralized delivery management for your entire operation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Add and manage multiple sales staff and drivers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Real-time visibility into all delivery requests and statuses</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Approve driver applications to build your trusted network</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-neutral-50 to-white p-8 rounded-2xl shadow-xl border-2 border-neutral-100">
              <div className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <UserCheck size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">For Sales Staff</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Submit delivery requests in seconds with detailed vehicle info</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Track pending, accepted, and upcoming deliveries</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Chat directly with drivers to coordinate details</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>View scheduled deliveries on a shared calendar</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-neutral-50 to-white p-8 rounded-2xl shadow-xl border-2 border-neutral-100">
              <div className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Truck size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">For Drivers</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Apply to work with multiple dealerships in your area</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Accept delivery requests that fit your schedule</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Set your availability and preferred delivery radius</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={20} className="text-neutral-700 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Communicate with sales staff through integrated chat</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-12">
            Join the platform that's streamlining vehicle deliveries for dealerships across the country.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={() => navigate('/register-dealer')}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl md:transform md:hover:scale-105 inline-flex items-center justify-center text-lg touch-target"
              data-testid="button-register-dealer"
            >
              Register Your Dealership
              <ArrowRight size={20} className="ml-2" />
            </button>
            <button
              onClick={() => navigate('/signup-driver')}
              className="w-full sm:w-auto bg-white text-neutral-900 px-8 py-4 rounded-xl font-bold hover:bg-neutral-100 transition-all shadow-lg hover:shadow-xl md:transform md:hover:scale-105 inline-flex items-center justify-center text-lg touch-target"
              data-testid="button-driver-signup"
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
