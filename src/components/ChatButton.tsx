import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatDialog } from './ChatDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

export const ChatButton = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      subscribeToMessages();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    // Get or create read status
    const { data: readStatus } = await supabase
      .from('chat_read_status')
      .select('last_read_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!readStatus) {
      await supabase
        .from('chat_read_status')
        .insert({ user_id: user.id, last_read_at: new Date().toISOString() });
      setUnreadCount(0);
      return;
    }

    // Count unread messages
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', readStatus.last_read_at);

    setUnreadCount(count || 0);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat_messages_unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && user) {
      // Mark messages as read when opening chat
      supabase
        .from('chat_read_status')
        .upsert({ user_id: user.id, last_read_at: new Date().toISOString() })
        .then(() => setUnreadCount(0));
    }
  };

  return (
    <>
      <Button
        size="icon"
        variant={isMobile ? "ghost" : "default"}
        className={isMobile ? "relative" : "fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"}
        onClick={() => handleOpenChange(true)}
      >
        <MessageCircle className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      <ChatDialog open={open} onOpenChange={handleOpenChange} />
    </>
  );
};