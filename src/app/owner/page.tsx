'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authService } from '@/firebase/auth';
import { firestoreService, type QRCode } from '@/firebase/firestore';

export default function OwnerDashboardPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;
      // Owners are tracked in users collection; use uid as ownerId match only if we store mapping.
      // For now, we list any QR codes created for a user document with id equal to uid (future enhancement may map via email).
      const myCodes = await firestoreService.qrCodes.getByOwner(user.uid);
      setQrCodes(myCodes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : qrCodes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No QR codes yet. Please contact your compound admin.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qrCodes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.ownerName}</TableCell>
                    <TableCell>{q.isActive ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <a href={`/api/qrcodes/preview`} target="_blank" rel="noreferrer">Preview</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


