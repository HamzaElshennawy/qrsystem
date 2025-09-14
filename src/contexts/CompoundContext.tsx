'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { firestoreService, type Compound } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';

interface CompoundContextType {
  selectedCompound: Compound | null;
  loading: boolean;
  setSelectedCompound: (compound: Compound | null) => void;
  refreshCompound: () => Promise<void>;
}

const CompoundContext = createContext<CompoundContextType | undefined>(undefined);

export function CompoundProvider({ children }: { children: ReactNode }) {
  const [selectedCompound, setSelectedCompoundState] = useState<Compound | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const setSelectedCompound = (compound: Compound | null) => {
    setSelectedCompoundState(compound);
    if (compound) {
      localStorage.setItem('selectedCompoundId', compound.id!);
    } else {
      localStorage.removeItem('selectedCompoundId');
    }
  };

  const refreshCompound = useCallback(async () => {
    const compoundId = searchParams.get('compound') || localStorage.getItem('selectedCompoundId');
    
    if (!compoundId) {
      setSelectedCompound(null);
      setLoading(false);
      return;
    }

    try {
      const compound = await firestoreService.compounds.getById(compoundId);
      if (compound) {
        setSelectedCompound(compound);
      } else {
        // Compound not found, redirect to compound selection
        router.push('/compound-selection');
      }
    } catch (error) {
      console.error('Error loading compound:', error);
      router.push('/compound-selection');
    } finally {
      setLoading(false);
    }
  }, [searchParams, router]);

  useEffect(() => {
    const checkAuthAndLoadCompound = async () => {
      // Check if user is authenticated
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      await refreshCompound();
    };

    checkAuthAndLoadCompound();
  }, [searchParams, router, refreshCompound]);

  const value: CompoundContextType = {
    selectedCompound,
    loading,
    setSelectedCompound,
    refreshCompound,
  };

  return (
    <CompoundContext.Provider value={value}>
      {children}
    </CompoundContext.Provider>
  );
}

export function useCompound() {
  const context = useContext(CompoundContext);
  if (context === undefined) {
    throw new Error('useCompound must be used within a CompoundProvider');
  }
  return context;
}
