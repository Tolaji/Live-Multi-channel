import { useState, useEffect } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    // Test backend connection
    fetch('http://localhost:3000/api/test')
      .then(res => res.json())
      .then(data => setBackendStatus(data.message))
      .catch(err => setBackendStatus('❌ Backend not connected'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Live Multi-Channel</h1>
        <p className="text-gray-400 mb-8">Setup Complete!</p>
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-sm text-gray-500 mb-2">Backend Status:</p>
          <p className="text-lg font-semibold text-green-400">{backendStatus}</p>
        </div>
      </div>
    </div>
  );
}

export default App;