import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onUpload: (fileUrl: string) => void;
  disabled?: boolean;
}

export const ImageUploader = ({ onUpload, disabled }: ImageUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      onUpload(publicUrl);
      
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="image-upload"
      />
      <Button
        onClick={() => inputRef.current?.click()}
        variant="outline"
        size="icon"
        disabled={disabled}
        type="button"
      >
        <Image className="h-4 w-4" />
      </Button>
    </>
  );
};
