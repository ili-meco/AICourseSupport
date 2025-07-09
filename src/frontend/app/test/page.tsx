"use client"

export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: 'blue', fontSize: '32px' }}>CSS Test Page</h1>
      
      {/* Inline style test */}
      <div style={{ 
        backgroundColor: 'red', 
        color: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <p>This box uses inline styles and should be RED with WHITE text.</p>
      </div>
      
      {/* Tailwind test */}
      <div className="bg-green-500 text-white p-5 rounded-lg my-5">
        <p>This box uses Tailwind and should be GREEN with WHITE text.</p>
      </div>
      
      {/* Multiple Tailwind classes test */}
      <div className="mt-4 p-6 bg-blue-500 text-white rounded-md shadow-lg hover:bg-blue-600">
        <h2 className="text-xl font-bold mb-2">Tailwind Features Test</h2>
        <p className="mb-4">This tests various Tailwind features.</p>
        <button className="px-4 py-2 bg-white text-blue-500 rounded hover:bg-gray-100">
          Test Button
        </button>
      </div>
    </div>
  )
}
