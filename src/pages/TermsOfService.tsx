import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-black mb-6 transition"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: November 21, 2025</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p>
                Welcome to SwapRunn. By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms").
                If you do not agree to these Terms, please do not use our services.
              </p>
              <p>
                SwapRunn provides a logistics platform connecting car dealerships, sales staff, and drivers for vehicle deliveries
                and dealer swaps. These Terms govern your use of our website, mobile application, and related services (collectively, the "Service").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. User Accounts and Registration</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">2.1 Account Types</h3>
              <p>SwapRunn offers three types of user accounts:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dealership Accounts:</strong> For authorized representatives of car dealerships</li>
                <li><strong>Sales Staff Accounts:</strong> For employees authorized by their dealership</li>
                <li><strong>Driver Accounts:</strong> For drivers employed by or contracted with dealerships to provide delivery services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">2.2 Registration Requirements</h3>
              <p>To use our Service, you must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your information to keep it accurate and complete</li>
                <li>Maintain the security of your password and accept all risks of unauthorized access</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">2.3 Account Verification</h3>
              <p>
                We reserve the right to verify your identity and eligibility to use our Service. You agree to provide any
                additional documentation we may request for verification purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Responsibilities</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">3.1 Dealership Responsibilities</h3>
              <p>Dealerships agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate information about vehicles for delivery</li>
                <li>Ensure authorized personnel have access to the platform</li>
                <li>Maintain appropriate insurance coverage for vehicles in transit</li>
                <li>Comply with all applicable laws and regulations regarding vehicle sales and transportation</li>
                <li>Properly vet and approve drivers who will transport their vehicles</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.2 Driver Responsibilities</h3>
              <p>Drivers agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Possess a valid driver's license and maintain it in good standing</li>
                <li>Maintain appropriate auto insurance coverage as required by law</li>
                <li>Operate vehicles safely and in compliance with all traffic laws</li>
                <li>Inspect vehicles before and after transportation</li>
                <li>Report any damage or issues immediately through the platform</li>
                <li>Communicate professionally with dealerships and sales staff</li>
                <li>Complete deliveries in a timely manner as agreed</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">3.3 Sales Staff Responsibilities</h3>
              <p>Sales staff agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Act within the authority granted by their employing dealership</li>
                <li>Provide accurate delivery information and vehicle details</li>
                <li>Coordinate with drivers professionally and promptly</li>
                <li>Report any issues or concerns through proper channels</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Employment and Service Relationship</h2>
              <p>
                <strong>Important:</strong> SwapRunn is a software platform that facilitates connections between dealerships, their employees,
                and their drivers. The employment or contractor relationships are between the dealership and their personnel, not with SwapRunn.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.1 SwapRunn's Role</h3>
              <p>SwapRunn provides technology services only. We:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide a platform for communication and coordination</li>
                <li>Enable dealerships to manage their delivery operations</li>
                <li>Facilitate connections between dealership personnel</li>
                <li>Do NOT employ drivers, sales staff, or other users</li>
                <li>Do NOT control how, when, or where drivers perform deliveries</li>
                <li>Are NOT responsible for employment compliance, payroll, or benefits</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">4.2 Dealership-Driver Relationship</h3>
              <p>
                Drivers using the platform are employed by or contracted directly with dealerships. The dealership is responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Determining employment classification (employee vs. independent contractor)</li>
                <li>Compliance with employment laws and regulations</li>
                <li>Payroll, taxes, and benefits if applicable</li>
                <li>Workers' compensation and employment insurance as required by law</li>
                <li>Driver supervision, training, and performance management</li>
                <li>Setting compensation terms and payment schedules</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Service Fees and Payment</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">5.1 Platform Fees</h3>
              <p>
                SwapRunn may charge fees for use of the platform. Current fee structures will be communicated to users and may
                include subscription fees, per-delivery fees, or transaction-based fees.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.2 Payment Terms</h3>
              <p>
                Payment arrangements between dealerships and their drivers/employees are made directly between those parties as part
                of their employment or contractor agreements. SwapRunn does not process, facilitate, or have any involvement in
                compensation between dealerships and their personnel.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">5.3 Fee Changes</h3>
              <p>
                We reserve the right to modify our fees with 30 days' notice to users. Continued use of the Service after
                fee changes constitutes acceptance of the new fees.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Liability and Insurance</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">6.1 Vehicle Damage</h3>
              <p>
                SwapRunn is not liable for any damage to vehicles during transportation. Liability for vehicle damage rests
                with the driver performing the delivery, their employing dealership, and/or applicable insurance carriers.
                Dealerships are responsible for maintaining adequate insurance coverage for their employees and contractors,
                and for vehicles in transit.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">6.2 Platform Liability</h3>
              <p>
                SwapRunn provides a platform to connect users but does not participate in the actual transportation of vehicles.
                We are not responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The actions or omissions of drivers, dealerships, or sales staff</li>
                <li>Vehicle condition, maintenance, or roadworthiness</li>
                <li>Accidents, injuries, or property damage occurring during deliveries</li>
                <li>Lost profits, business interruption, or consequential damages</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">6.3 Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SWAPRUNN'S TOTAL LIABILITY FOR ANY CLAIMS RELATED TO THE SERVICE
                SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO SWAPRUNN IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">7.1 User Disputes</h3>
              <p>
                Disputes between users (e.g., between a dealership and their drivers or employees, or between dealerships) should be
                resolved directly between those parties through their existing employment or business relationships. SwapRunn may provide
                communication tools but is not obligated to mediate or resolve user disputes, including employment-related matters.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">7.2 Disputes with SwapRunn</h3>
              <p>
                For disputes with SwapRunn regarding the Service, you agree to first contact us at ltancreti7@gmail.com to
                attempt informal resolution. If informal resolution fails, disputes shall be resolved through binding arbitration
                in accordance with the rules of the American Arbitration Association.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">7.3 Class Action Waiver</h3>
              <p>
                You agree to resolve disputes with SwapRunn on an individual basis and waive any right to participate in class
                actions or class-wide arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p>
                The SwapRunn platform, including its design, features, text, graphics, logos, and software, is owned by SwapRunn
                and protected by copyright, trademark, and other intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copy, modify, or create derivative works of the Service</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Use the SwapRunn name, logo, or trademarks without written permission</li>
                <li>Remove or alter any copyright, trademark, or proprietary notices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Prohibited Conduct</h2>
              <p>Users may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Provide false, inaccurate, or misleading information</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Use automated systems or software to extract data from the Service</li>
                <li>Harass, abuse, or harm another user</li>
                <li>Transmit viruses, malware, or other malicious code</li>
                <li>Use the Service to compete with SwapRunn</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Account Termination</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">10.1 Termination by User</h3>
              <p>
                You may terminate your account at any time through the account settings page. Account deletion is permanent and
                cannot be undone.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">10.2 Termination by SwapRunn</h3>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without notice, for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violation of these Terms</li>
                <li>Fraudulent, abusive, or illegal activity</li>
                <li>Extended periods of inactivity</li>
                <li>At our sole discretion if we determine termination is necessary</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">10.3 Effect of Termination</h3>
              <p>
                Upon termination, your right to use the Service immediately ceases. We may delete your data in accordance with
                our Privacy Policy. Provisions regarding liability, indemnification, and dispute resolution survive termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Privacy and Data Protection</h2>
              <p>
                Your use of the Service is subject to our Privacy Policy, which is incorporated into these Terms by reference.
                Please review our <button
                  onClick={() => navigate('/privacy-policy')}
                  className="text-red-600 hover:text-red-700 underline font-semibold"
                >
                  Privacy Policy
                </button> to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless SwapRunn, its officers, directors, employees, and agents from
                any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Your violation of any applicable laws or regulations</li>
                <li>Any vehicle damage, accidents, or injuries related to deliveries you participate in</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Disclaimers</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
                INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="mt-4">
                SWAPRUNN DOES NOT WARRANT THAT:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>The results obtained from use of the Service will be accurate or reliable</li>
                <li>Any errors in the Service will be corrected</li>
                <li>The Service will meet your specific requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the revised Terms on our website</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending notice to your registered email address for significant changes</li>
              </ul>
              <p className="mt-4">
                Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
                If you do not agree to the modified Terms, you must stop using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Vermont,
                without regard to its conflict of law provisions. Any legal action or proceeding related to your use of the
                Service shall be brought exclusively in the federal or state courts located in Windsor County, Vermont.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Severability</h2>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain
                in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid
                and enforceable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy and any other policies referenced herein, constitute the entire
                agreement between you and SwapRunn regarding use of the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">18. Contact Information</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p className="font-semibold">SwapRunn Support</p>
                <p>Email: <a href="mailto:ltancreti7@gmail.com" className="text-red-600 hover:text-red-700">ltancreti7@gmail.com</a></p>
                <p className="text-sm text-gray-600 mt-2">
                  For all support and legal inquiries: <a href="mailto:ltancreti7@gmail.com" className="text-red-600 hover:text-red-700">ltancreti7@gmail.com</a>
                </p>
              </div>
            </section>

            <section className="border-t border-gray-300 pt-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">19. Additional State-Specific Terms</h2>
              <p>
                Some states may require additional disclosures or have specific laws that affect these Terms. If you are located
                in California, you have specific rights under California law, including those described in our Privacy Policy.
              </p>
            </section>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-8">
              <p className="font-semibold text-blue-900 mb-2">Important Notice</p>
              <p className="text-sm text-blue-800">
                By creating an account or using SwapRunn, you acknowledge that you have read, understood, and agree to be bound
                by these Terms of Service. Please print or save a copy of these Terms for your records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
