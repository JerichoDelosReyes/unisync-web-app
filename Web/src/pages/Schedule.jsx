/**
 * Schedule & Rooms Page (Placeholder)
 * 
 * Will show room scheduling with conflict detection and best-fit assignment.
 */
export default function Schedule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule & Rooms</h1>
        <p className="text-gray-600 mt-1">View schedules and manage room bookings.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          The scheduling module will feature conflict detection algorithms, 
          best-fit room assignment, and real-time vacancy status indicators.
        </p>
      </div>
    </div>
  )
}
