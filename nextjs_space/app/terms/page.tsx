
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata = {
  title: 'Terms and Conditions',
  description: 'Terms and conditions for using the POS System'
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/auth/register">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Registration
            </Button>
          </Link>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
              <p className="text-gray-600">Last updated: November 10, 2025</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>POS System Terms and Conditions</CardTitle>
            <CardDescription>
              Please read these terms and conditions carefully before using our service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing and using this POS System, you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please do 
                not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Use License</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                Permission is granted to temporarily use this POS System for personal, 
                non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained in the system</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Your privacy is important to us. We collect and use information about you and your business 
                to provide and improve our POS services. All data is stored securely and used only for 
                providing the service to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Service Availability</h2>
              <p className="text-gray-600 leading-relaxed">
                While we strive to provide continuous service, we do not guarantee 100% uptime. 
                We reserve the right to modify or discontinue the service at any time with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. User Responsibilities</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                As a user of this POS System, you are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>Using the system in compliance with all applicable laws</li>
                <li>Ensuring accuracy of data entered into the system</li>
                <li>Regular backups of your important business data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">
                In no event shall POS System or its suppliers be liable for any damages 
                (including, without limitation, damages for loss of data or profit, or due to business 
                interruption) arising out of the use or inability to use the materials on the system, 
                even if POS System or an authorized representative has been notified orally or in 
                writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact Information</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about these Terms and Conditions, please contact us at 
                support@possystem.com or through our support system within the application.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/auth/register">
            <Button>
              I Agree to These Terms
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
