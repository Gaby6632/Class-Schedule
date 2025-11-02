import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onSend: (fileUrl: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onSend, disabled }: VoiceRecorderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendRecording = async () => {
    if (!audioBlob || !user) return;

    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      onSend(publicUrl);
      setAudioBlob(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (audioBlob) {
    return (
      <div className="flex gap-2 items-center">
        <audio src={URL.createObjectURL(audioBlob)} controls className="flex-1" />
        <Button onClick={sendRecording} size="icon">
          <Send className="h-4 w-4" />
        </Button>
        <Button onClick={() => setAudioBlob(null)} variant="ghost" size="icon">
          ✕
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={isRecording ? stopRecording : startRecording}
      variant={isRecording ? 'destructive' : 'outline'}
      size="icon"
      disabled={disabled}
    >
      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};
