'use client';

import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from 'next/navigation';
import { authService } from '@/firebase/auth';

export default function OwnerLoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmationRef = useRef<any>(null);
  const router = useRouter();

  const sendCode = async () => {
    try {
      setLoading(true);
      setError('');
      const verifier = authService.initRecaptcha('recaptcha-container');
      const conf = await authService.sendOtp(phone, verifier);
      confirmationRef.current = conf;
      setStep('verify');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    try {
      setLoading(true);
      setError('');
      await authService.confirmOtp(confirmationRef.current, code);
      router.push('/owner');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Owner Sign In</CardTitle>
            <CardDescription>Sign in with your phone number</CardDescription>
          </CardHeader>
          <CardContent>
            <div id="recaptcha-container" />
            {step === 'send' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="Enter your phone number"
                  />
                </div>
                <Button onClick={sendCode} className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Code'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Enter OTP</Label>
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <Button onClick={verify} className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
              </div>
            )}
            {error && (
              <Alert className="mt-4" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


