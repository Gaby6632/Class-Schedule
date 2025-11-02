import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  chat_color: string;
  hasConversation?: boolean;
  unreadCount?: number;
}

interface ContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
}

export const ContactsDialog = ({ open, onOpenChange, onSelectUser }: ContactsDialogProps) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Profile[]>([]);

  useEffect(() => {
    if (open && user) {
      loadContacts();
    }
  }, [open, user]);

  const loadContacts = async () => {
    if (!user) return;

    // Get all profiles
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, chat_color')
      .neq('id', user.id);

    if (!allProfiles) return;

    // Get conversations (users we've messaged)
    const { data: messages } = await supabase
      .from('private_messages')
      .select('sender_id, receiver_id, is_read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const conversationUserIds = new Set<string>();
    const unreadCounts: Record<string, number> = {};

    messages?.forEach(msg => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      conversationUserIds.add(otherId);
      
      // Count unread messages from others
      if (msg.receiver_id === user.id && !msg.is_read) {
        unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
      }
    });

    const withConversations = allProfiles
      .filter(p => conversationUserIds.has(p.id))
      .map(p => ({ ...p, hasConversation: true, unreadCount: unreadCounts[p.id] || 0 }));

    const withoutConversations = allProfiles
      .filter(p => !conversationUserIds.has(p.id))
      .map(p => ({ ...p, hasConversation: false }));

    setConversations(withConversations);
    setProfiles(withoutConversations);
  };

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    onOpenChange(false);
  };

  const UserItem = ({ profile }: { profile: Profile }) => (
    <div
      onClick={() => handleSelectUser(profile.id)}
      className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
    >
      <Avatar>
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback style={{ backgroundColor: profile.chat_color }}>
          {profile.display_name[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{profile.display_name}</p>
      </div>
      {profile.unreadCount ? (
        <Badge variant="destructive">{profile.unreadCount}</Badge>
      ) : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contacts</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          {conversations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2 px-3">Recent Chats</h3>
              <div className="space-y-1">
                {conversations.map(profile => (
                  <UserItem key={profile.id} profile={profile} />
                ))}
              </div>
            </div>
          )}

          {profiles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 px-3">All Users</h3>
              <div className="space-y-1">
                {profiles.map(profile => (
                  <UserItem key={profile.id} profile={profile} />
                ))}
              </div>
            </div>
          )}

          {conversations.length === 0 && profiles.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
