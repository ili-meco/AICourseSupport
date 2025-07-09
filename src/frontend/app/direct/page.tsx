"use client"

export default function DirectTailwindTest() {
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">Direct Tailwind Test</h1>
      
      {/* Direct Tailwind Classes */}
      <div className="bg-red-500 text-white p-5 rounded-lg mb-4">
        <p className="font-bold text-xl">This is a direct red Tailwind box</p>
        <p>Using bg-red-500 directly</p>
      </div>

      <div className="bg-green-500 text-white p-5 rounded-lg mb-4">
        <p className="font-bold text-xl">This is a direct green Tailwind box</p>
        <p>Using bg-green-500 directly</p>
      </div>

      <div className="bg-blue-500 text-white p-5 rounded-lg mb-4">
        <p className="font-bold text-xl">This is a direct blue Tailwind box</p>
        <p>Using bg-blue-500 directly</p>
      </div>

      <div className="flex space-x-4 mt-6">
        <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
          Purple Button
        </button>
        <button className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600">
          Yellow Button
        </button>
        <button className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
          Dark Button
        </button>
      </div>
    </div>
  )
}
