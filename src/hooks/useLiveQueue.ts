'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, QueueToken, getTodayIST } from '@/lib/supabase';

export function useLiveQueue() {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionDate = getTodayIST();

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from('queue_tokens')
      .select('*')
      .eq('session_date', sessionDate)
      .order('sort_order', { ascending: true })
      .order('token_number', { ascending: true });

    if (!error && data) {
      setTokens(data as QueueToken[]);
    }
    setLoading(false);
  }, [sessionDate]);

  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('live-clinic-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_tokens',
          filter: `session_date=eq.${sessionDate}`,
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQueue, sessionDate]);

  return { tokens, loading, refetch: fetchQueue, sessionDate };
}