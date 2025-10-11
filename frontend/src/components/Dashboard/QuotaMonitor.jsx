// components/Dashboard/QuotaMonitor.jsx

import React, { useState, useEffect } from 'react';

export default function QuotaMonitor() {
  const [quotaUsage, setQuotaUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchQuota() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/quota`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          setQuotaUsage(data);
        }
      } catch (err) {
        console.error('Error fetching quota:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchQuota();
    const interval = setInterval(fetchQuota, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading || !quotaUsage) return null;
  
  const percentUsed = (quotaUsage.used / quotaUsage.limit) * 100;
  const isWarning = percentUsed > 70;
  const isDanger = percentUsed > 90;
  
  return (
    <div className={`px-4 py-2 text-sm ${
      isDanger ? 'bg-red-900/30 text-red-400' :
      isWarning ? 'bg-yellow-900/30 text-yellow-400' :
      'bg-gray-800 text-gray-400'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span>API Quota</span>
        <span className="font-mono">
          {quotaUsage.used.toLocaleString()} / {quotaUsage.limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            isDanger ? 'bg-red-500' :
            isWarning ? 'bg-yellow-500' :
            'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
    </div>
  );
}