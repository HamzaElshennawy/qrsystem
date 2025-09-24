'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from '@/firebase/auth';

export default function APITestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPIs = async () => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      
      if (!user) {
        setTestResults({ error: "No user logged in" });
        return;
      }

      const results: any = {
        user: {
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
        tests: {}
      };

      // Test 1: Compounds List API
      try {
        const compoundsResponse = await fetch('/api/compounds/list');
        const compoundsData = await compoundsResponse.json();
        results.tests.compoundsList = {
          status: compoundsResponse.status,
          success: compoundsData.success,
          data: compoundsData.compounds?.length || 0,
          error: compoundsData.error
        };
      } catch (error) {
        results.tests.compoundsList = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Test 2: Owner Profile API
      try {
        const params = new URLSearchParams();
        if (user.phoneNumber) params.append('phone', user.phoneNumber);
        if (user.email) params.append('email', user.email);
        if (user.uid) params.append('uid', user.uid);

        const profileResponse = await fetch(`/api/owner/profile?${params.toString()}`);
        const profileData = await profileResponse.json();
        results.tests.ownerProfile = {
          status: profileResponse.status,
          success: profileData.success,
          ownersFound: profileData.owners?.length || 0,
          debug: profileData.debug,
          error: profileData.error
        };
      } catch (error) {
        results.tests.ownerProfile = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      setTestResults(results);
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testAPIs} disabled={loading}>
            {loading ? 'Testing...' : 'Test APIs'}
          </Button>
          
          {testResults && (
            <div className="mt-4">
              <Alert>
                <AlertDescription>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
