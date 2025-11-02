import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Copy, Trash2, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VoiceRecorder } from './VoiceRecorder';
import { ImageUploader } from './ImageUploader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  chat_color: string;
}

interface PrivateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string | null;
}

export const PrivateChatDialog = ({ open, onOpenChange, recipientId }: PrivateChatDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && recipientId) {
      loadRecipient();
      loadMessages();
      subscribeToMessages();
      markMessagesAsRead();
    }
  }, [open, recipientId]);

  const loadRecipient = async () => {
    if (!recipientId) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, chat_color')
      .eq('id', recipientId)
      .single();

    if (data) setRecipient(data);
  };

  const loadMessages = async () => {
    if (!user || !recipientId) return;

    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('private_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    if (!user || !recipientId) return;

    await supabase
      .from('private_messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', recipientId)
      .eq('is_read', false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !newMessage) || !user || !recipientId) return;

    const { error } = await supabase
      .from('private_messages')
      .insert({
        sender_id: user.id,
        receiver_id: recipientId,
        content: newMessage.trim(),
        message_type: 'text',
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
  };

  const handleSendMedia = async (fileUrl: string, type: 'image' | 'audio') => {
    if (!user || !recipientId) return;

    const { error } = await supabase
      .from('private_messages')
      .insert({
        sender_id: user.id,
        receiver_id: recipientId,
        file_url: fileUrl,
        message_type: type,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to clipboard' });
  };

  const handleDelete = async (messageId: string) => {
    const { error } = await supabase
      .from('private_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!recipient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={recipient.avatar_url || undefined} />
                <AvatarFallback style={{ backgroundColor: recipient.chat_color }}>
                  {recipient.display_name[0]}
                </AvatarFallback>
              </Avatar>
              <DialogTitle>{recipient.display_name}</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {message.message_type === 'text' && message.content}
                      {message.message_type === 'image' && (
                        <img src={message.file_url || ''} alt="Shared" className="max-w-full rounded" />
                      )}
                      {message.message_type === 'audio' && (
                        <audio src={message.file_url || ''} controls className="max-w-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOwn && (
                        <>
                          {message.is_read ? (
                            <CheckCheck className="h-3 w-3 text-primary" />
                          ) : (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5">
                                ⋮
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {message.message_type === 'text' && (
                                <DropdownMenuItem onClick={() => handleCopy(message.content || '')}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDelete(message.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2 p-4 border-t">
          <ImageUploader onUpload={(url) => handleSendMedia(url, 'image')} />
          <VoiceRecorder onSend={(url) => handleSendMedia(url, 'audio')} />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
