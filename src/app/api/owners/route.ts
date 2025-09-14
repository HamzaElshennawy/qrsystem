import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const compoundId = searchParams.get('compoundId');

    let owners = [];

    if (compoundId) {
      // Get owners for a specific compound
      const compound = await firestoreService.compounds.getById(compoundId);
      if (!compound || compound.adminId !== currentUser.uid) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
      owners = await firestoreService.owners.getByCompound(compoundId);
    } else {
      // Get owners for all compounds owned by the user
      const compounds = await firestoreService.compounds.getByAdmin(currentUser.uid);
      const allOwners = [];
      
      for (const compound of compounds) {
        const compoundOwners = await firestoreService.owners.getByCompound(compound.id!);
        allOwners.push(...compoundOwners);
      }
      
      owners = allOwners;
    }
    
    return NextResponse.json({
      success: true,
      owners,
    });
  } catch (error: any) {
    console.error('Get owners error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch owners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { firstName, lastName, email, phone, propertyUnit, compoundId } = await request.json();

    if (!firstName || !lastName || !email || !compoundId) {
      return NextResponse.json(
        { error: 'Required fields: firstName, lastName, email, compoundId' },
        { status: 400 }
      );
    }

    // Verify the user owns this compound
    const compound = await firestoreService.compounds.getById(compoundId);
    if (!compound || compound.adminId !== currentUser.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const ownerData = {
      compoundId,
      firstName,
      lastName,
      email,
      phone: phone || '',
      propertyUnit: propertyUnit || '',
      isActive: true,
    };

    const ownerId = await firestoreService.owners.create(ownerData);
    
    return NextResponse.json({
      success: true,
      ownerId,
      message: 'Owner created successfully',
    });
  } catch (error: any) {
    console.error('Create owner error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create owner' },
      { status: 500 }
    );
  }
}
