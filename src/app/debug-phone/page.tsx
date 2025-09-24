'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from '@/firebase/auth';
import { firestoreService } from '@/firebase/firestore';

export default function PhoneDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const runDebug = async () => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      
      if (!user) {
        setDebugInfo({ error: "No user logged in" });
        return;
      }

      const phoneNumber = user.phoneNumber;
      console.log("Current user phone number:", phoneNumber);

      // Get all users for comparison
      const users = await firestoreService.query("users", []);
      setAllUsers(users);

      // Test the enhanced phone search
      const owners = await firestoreService.users.getByPhoneEnhanced(phoneNumber || '');

      setDebugInfo({
        currentUser: {
          uid: user.uid,
          phoneNumber: phoneNumber,
          email: user.email,
        },
        phoneSearch: {
          searchedPhone: phoneNumber,
          foundOwners: owners.length,
          owners: owners,
        },
        database: {
          totalUsers: users.length,
          usersWithPhone: users.filter(u => u.phone).length,
          samplePhones: users.filter(u => u.phone).slice(0, 5).map(u => ({ id: u.id, phone: u.phone, name: `${u.firstName} ${u.lastName}` })),
        }
      });

    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phone Number Debug Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDebug} disabled={loading}>
            {loading ? 'Running Debug...' : 'Run Phone Number Debug'}
          </Button>
          
          {debugInfo && (
            <div className="mt-4 space-y-4">
              <Alert>
                <AlertDescription>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {allUsers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">All Users in Database:</h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Compound ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{user.id}</td>
                        <td className="p-2">{user.firstName} {user.lastName}</td>
                        <td className="p-2 font-mono">{user.phone || 'N/A'}</td>
                        <td className="p-2">{user.email}</td>
                        <td className="p-2 font-mono text-xs">{user.compoundId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
