import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const compoundId = formData.get('compoundId') as string;

    if (!file || !compoundId) {
      return NextResponse.json(
        { error: 'File and compoundId are required' },
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

    // Read and parse CSV file
    const csvText = await file.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    // Validate required columns
    const requiredColumns = ['firstName', 'lastName', 'email'];
    const headers = Object.keys(records[0] || {});
    
    for (const column of requiredColumns) {
      if (!headers.includes(column)) {
        return NextResponse.json(
          { error: `Missing required column: ${column}` },
          { status: 400 }
        );
      }
    }

    // Process each record
    const owners = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const ownerData = {
          compoundId,
          firstName: record.firstName.trim(),
          lastName: record.lastName.trim(),
          email: record.email.trim(),
          phone: record.phone?.trim() || '',
          propertyUnit: record.propertyUnit?.trim() || '',
          isActive: true,
        };

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ownerData.email)) {
          throw new Error(`Invalid email format: ${ownerData.email}`);
        }

        owners.push(ownerData);
      } catch (error: any) {
        errors.push({
          row: i + 2, // +2 because CSV is 1-indexed and we skip header
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors,
        message: 'Some rows had errors',
      }, { status: 400 });
    }

    // Bulk create owners
    const ownerIds = await firestoreService.owners.bulkCreate(owners);
    
    return NextResponse.json({
      success: true,
      ownerIds,
      count: owners.length,
      message: `Successfully imported ${owners.length} owners`,
    });
  } catch (error: any) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
