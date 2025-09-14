'use client';

import { useState } from 'react';
import { firestoreService } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';

export default function TestFirestorePage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testFirestore = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      // Check if user is authenticated
      const user = authService.getCurrentUser();
      if (!user) {
        setResult('❌ User not authenticated');
        return;
      }
      
      setResult(`✅ User authenticated: ${user.email}`);
      
      // Try to create a test compound
      const testCompound = {
        name: 'Test Compound',
        address: 'Test Address',
        adminId: user.uid,
        adminEmail: user.email || '',
      };
      
      const compoundId = await firestoreService.compounds.create(testCompound);
      setResult(`✅ Compound created successfully! ID: ${compoundId}`);
      
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Firestore test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Firestore Test</h1>
        
        <button
          onClick={testFirestore}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Firestore Connection'}
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Make sure you're logged in</li>
            <li>Click "Test Firestore Connection"</li>
            <li>Check the result above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
