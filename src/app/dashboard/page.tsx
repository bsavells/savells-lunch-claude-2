'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'parent') {
        router.replace('/dashboard/overview');
      } else {
        router.replace('/dashboard/menu');
      }
    }
  }, [user, loading, router]);

  return null;
}
