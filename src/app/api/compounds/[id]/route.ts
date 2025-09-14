import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const compound = await firestoreService.compounds.getById(params.id);
    
    if (!compound) {
      return NextResponse.json(
        { error: 'Compound not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this compound
    if (compound.adminId !== currentUser.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      compound,
    });
  } catch (error: any) {
    console.error('Get compound error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch compound' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const compound = await firestoreService.compounds.getById(params.id);
    
    if (!compound) {
      return NextResponse.json(
        { error: 'Compound not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this compound
    if (compound.adminId !== currentUser.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updateData = await request.json();
    await firestoreService.update('compounds', params.id, updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Compound updated successfully',
    });
  } catch (error: any) {
    console.error('Update compound error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update compound' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const compound = await firestoreService.compounds.getById(params.id);
    
    if (!compound) {
      return NextResponse.json(
        { error: 'Compound not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this compound
    if (compound.adminId !== currentUser.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await firestoreService.delete('compounds', params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Compound deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete compound error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete compound' },
      { status: 500 }
    );
  }
}
