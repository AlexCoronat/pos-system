
import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {children}
        </div>
      </div>

      {/* Right side - Hero Image */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-green-600">
          <div className="relative h-full w-full overflow-hidden rounded-l-2xl">
            <Image
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              src="https://cdn.abacus.ai/images/2c67362c-89b6-4047-9854-4185bb075854.jpg"
              alt="Modern POS System"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 0px"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">
                  Modern Point of Sale System
                </h2>
                <p className="text-xl text-blue-100">
                  Streamline your retail operations with our comprehensive POS solution.
                  Manage inventory, process sales, and track performance across multiple locations.
                </p>
                <div className="flex items-center space-x-6 text-sm text-blue-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Multi-location Support
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Real-time Reporting
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Secure & Reliable
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
