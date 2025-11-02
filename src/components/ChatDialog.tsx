import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VoiceRecorder } from './VoiceRecorder';
import { ImageUploader } from './ImageUploader';

interface Message {
  id: string;
  content: string;
  message_type?: string;
  file_url?: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string;
    chat_color: string;
    avatar_url: string | null;
    gradient_start: string | null;
    gradient_end: string | null;
    user_roles: Array<{ role: string }>;
  };
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatDialog = ({ open, onOpenChange }: ChatDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadMessages();
      subscribeToMessages();
    }
  }, [open]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, profiles(display_name, chat_color, avatar_url, gradient_start, gradient_end, user_roles(role))')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data as Message[]);
    scrollToBottom();
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
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
    if (!user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        content: '',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.chat}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((message) => {
            const isOwn = message.user_id === user?.id;
            const isAdmin = message.profiles.user_roles?.some(r => r.role === 'admin' || r.role === 'developer');
            const isDeveloper = message.profiles.user_roles?.some(r => r.role === 'developer');
            
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.profiles.avatar_url || undefined} />
                  <AvatarFallback style={{ backgroundColor: message.profiles.chat_color }}>
                    {message.profiles.display_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <span
                    className={`text-xs font-medium ${
                      message.profiles.gradient_start && message.profiles.gradient_end
                        ? 'bg-clip-text text-transparent'
                        : ''
                    }`}
                    style={
                      message.profiles.gradient_start && message.profiles.gradient_end
                        ? {
                            backgroundImage: `linear-gradient(to right, ${message.profiles.gradient_start}, ${message.profiles.gradient_end})`,
                          }
                        : { color: message.profiles.chat_color }
                    }
                  >
                    {message.profiles.display_name}
                  </span>
                  <div
                    className={`px-3 py-2 rounded-lg max-w-xs ${
                      isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {(!message.message_type || message.message_type === 'text') && message.content}
                    {message.message_type === 'image' && (
                      <img src={message.file_url || ''} alt="Shared" className="max-w-full rounded" />
                    )}
                    {message.message_type === 'audio' && (
                      <audio src={message.file_url || ''} controls className="max-w-full" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 p-4 border-t">
          <ImageUploader onUpload={(url) => handleSendMedia(url, 'image')} />
          <VoiceRecorder onSend={(url) => handleSendMedia(url, 'audio')} />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t.typeMessage}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};