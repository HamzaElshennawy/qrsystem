'use client';

import { useRef, useState, useEffect, useCallback } from 'react';


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from 'next/navigation';
import { authService } from '@/firebase/auth';
import { generateDeviceFingerprint } from '@/lib/device-fingerprint';
import { ConfirmationResult } from 'firebase/auth';

type LoginStep = 'initial' | 'otp' | 'verify' | 'setup-password' | 'password-login';

export default function OwnerLoginPage() {
  const [step, setStep] = useState<LoginStep>('initial');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [userAgent, setUserAgent] = useState<string>('');
  const [owner, setOwner] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    hasPassword: boolean;
    isFirstTimeLogin: boolean;
  } | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const router = useRouter();

  const checkAuthenticationStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/auth/check-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceFingerprint,
          userAgent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOwner(data.owner);
        
        if (data.owner && data.owner.hasPassword && !data.requiresOTP) {
          // User is authenticated and has password, show password login
          setStep('password-login');
        } else {
          // User needs OTP verification (first time or new device)
          setStep('otp');
        }
      } else {
        // User not authenticated, start with OTP
        setStep('otp');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to check authentication status');
      // Default to OTP if check fails
      setStep('otp');
    } finally {
      setLoading(false);
    }
  }, [deviceFingerprint, userAgent]);

  useEffect(() => {
    // Generate device fingerprint on component mount
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);
    setUserAgent(navigator.userAgent);
    
    // Check if user is already authenticated
    if (fingerprint) {
      checkAuthenticationStatus();
    }
  }, [checkAuthenticationStatus]);

  const sendOtp = async () => {
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

  const verifyOtp = async () => {
    try {
      setLoading(true);
      setError('');
      await authService.confirmOtp(confirmationRef.current!, code);
      
      // After OTP verification, check user status and determine next step
      const response = await fetch('/api/auth/check-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceFingerprint,
          userAgent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOwner(data.owner);
        
        // Check if user needs to set up password
        if (data.owner?.isFirstTimeLogin || !data.owner?.hasPassword) {
          setStep('setup-password');
        } else {
          // User has password, activate device and redirect
          await activateDevice();
          router.push('/owner');
        }
      } else {
        // If we can't check status, default to password setup for new users
        setStep('setup-password');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const setupPassword = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirmPassword,
          deviceFingerprint,
          userAgent,
          ownerId: owner?.id,
          phone: phone,
          email: owner?.email,
          firebaseUid: authService.getCurrentUser()?.uid,
        }),
      });

      if (response.ok) {
        // Activate device and redirect
        await activateDevice();
        router.push('/owner');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to set up password');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to set up password');
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
          password,
          deviceFingerprint,
          userAgent,
          firebaseUid: authService.getCurrentUser()?.uid,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.requiresOTP) {
          // New device detected, need OTP verification
          setOwner(data.owner);
          setStep('otp');
        } else {
          // Known device, login successful
          router.push('/owner');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const activateDevice = async () => {
    try {
      const response = await fetch('/api/auth/activate-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceFingerprint,
          userAgent,
          ownerId: owner?.id,
          phone: phone,
          email: owner?.email,
          firebaseUid: authService.getCurrentUser()?.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate device');
      }
    } catch (e: unknown) {
      console.error('Failed to activate device:', e);
      // Don't block the flow if device activation fails
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Owner Sign In</CardTitle>
            <CardDescription>
              {step === 'initial' && 'Checking your authentication status...'}
              {step === 'otp' && 'Enter your phone number for OTP verification'}
              {step === 'verify' && 'Enter the OTP code sent to your phone'}
              {step === 'setup-password' && 'Set up your password for future logins'}
              {step === 'password-login' && 'Sign in with your email/phone and password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div id="recaptcha-container" />
            
            {step === 'initial' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>Checking your authentication status...</p>
                </div>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="Enter your phone number"
                  />
                </div>
                <Button onClick={sendOtp} className="w-full" disabled={loading || !phone}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setStep('initial')} 
                  className="w-full"
                  disabled={loading}
                >
                  Back
                </Button>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Enter OTP Code</Label>
                  <Input 
                    id="code" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
                <Button onClick={verifyOtp} className="w-full" disabled={loading || code.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setStep('otp')} 
                  className="w-full"
                  disabled={loading}
                >
                  Back
                </Button>
              </div>
            )}

            {step === 'setup-password' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                </div>
                <Button onClick={setupPassword} className="w-full" disabled={loading || !password || !confirmPassword}>
                  {loading ? 'Setting up...' : 'Set Password & Continue'}
                </Button>
              </div>
            )}

            {step === 'password-login' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Enter either email or phone number
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <Button 
                  onClick={loginWithPassword} 
                  className="w-full" 
                  disabled={loading || (!email && !phone) || !password}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('otp')} 
                    className="flex-1"
                    disabled={loading}
                  >
                    Use OTP Instead
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('initial')} 
                    className="flex-1"
                    disabled={loading}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


