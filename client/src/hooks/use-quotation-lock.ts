import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface LockStatus {
  isLocked: boolean;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: number;
}

interface UseQuotationLockResult {
  isLocked: boolean;
  isLockedByOthers: boolean;
  lockedByName?: string;
  acquireLock: () => Promise<any>;
  releaseLock: () => Promise<any>;
}

export function useQuotationLock(quotationId: string | undefined): UseQuotationLockResult {
  const [hasLock, setHasLock] = useState(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get lock status
  const { data: lockStatus } = useQuery<LockStatus>({
    queryKey: ['/api/quotations', quotationId, 'lock'],
    enabled: !!quotationId,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Acquire lock mutation
  const acquireLockMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/quotations/${quotationId}/lock`);
    },
    onSuccess: () => {
      setHasLock(true);
      startHeartbeat();
      queryClient.invalidateQueries({ queryKey: ['/api/quotations', quotationId, 'lock'] });
    },
    onError: (error: any) => {
      console.error('Failed to acquire lock:', error);
      setHasLock(false);
    },
  });

  // Release lock mutation
  const releaseLockMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/quotations/${quotationId}/lock`);
    },
    onSuccess: () => {
      setHasLock(false);
      stopHeartbeat();
      queryClient.invalidateQueries({ queryKey: ['/api/quotations', quotationId, 'lock'] });
    },
  });

  // Heartbeat to keep lock alive
  const sendHeartbeat = async () => {
    if (!quotationId || !hasLock) return;
    try {
      await apiRequest('PATCH', `/api/quotations/${quotationId}/lock`);
    } catch (error) {
      console.error('Heartbeat failed:', error);
      setHasLock(false);
      stopHeartbeat();
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    // Send heartbeat every 10 seconds (lock expires after 30s)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  // Try to acquire lock on mount
  useEffect(() => {
    if (quotationId) {
      acquireLockMutation.mutate();
    }

    // Release lock and stop heartbeat on unmount
    return () => {
      stopHeartbeat();
      // Use a ref or check mutations to release lock
      if (quotationId) {
        apiRequest('DELETE', `/api/quotations/${quotationId}/lock`).catch(console.error);
      }
    };
  }, [quotationId]);

  const isLockedByOthers = lockStatus?.isLocked && !hasLock;

  return {
    isLocked: lockStatus?.isLocked || false,
    isLockedByOthers: isLockedByOthers || false,
    lockedByName: isLockedByOthers ? lockStatus?.lockedByName : undefined,
    acquireLock: () => acquireLockMutation.mutateAsync(),
    releaseLock: () => releaseLockMutation.mutateAsync(),
  };
}
