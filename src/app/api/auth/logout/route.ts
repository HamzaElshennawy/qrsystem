import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/firebase/auth';

export async function POST(request: NextRequest) {
  try {
    await authService.signOut();
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 400 }
    );
  }
}
