import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#14b8a6', '#f97316', '#a855f7', '#ec4899',
];

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProfileDialog = ({ open, onOpenChange }: EditProfileDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      loadProfile();
    }
  }, [user, open]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, chat_color')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setDisplayName(data.display_name);
      setSelectedColor(data.chat_color);
    }
  };

  const handleSave = async () => {
    if (!user || !displayName || !selectedColor) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        chat_color: selectedColor,
      })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.editProfile}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t.displayName}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.displayName}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.chooseColor}</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    selectedColor === color ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};