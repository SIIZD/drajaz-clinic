'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, QueueToken, getTodayIST } from '@/lib/supabase';

export function useLiveQueue() {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDate, setSessionDate] = useState<string>('');

  useEffect(() => {
    setSessionDate(getTodayIST());
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!sessionDate) return;
    const { data, error } = await supabase
      .from('public_queue_board')
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
    if (!sessionDate) return;
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
