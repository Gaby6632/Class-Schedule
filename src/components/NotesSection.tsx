import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

export const NotesSection = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [publicNote, setPublicNote] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadNotes();
    loadAlerts();
    subscribeToAlerts();
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    setIsAdmin(data?.some(r => r.role === 'admin' || r.role === 'developer') || false);
  };

  const loadNotes = async () => {
    if (!user) return;

    // Load public note
    const { data: publicData } = await supabase
      .from('notes')
      .select('*')
      .eq('is_public', true)
      .maybeSingle();

    if (publicData) {
      setPublicNote(publicData.content);
    }

    // Load private note
    const { data: privateData } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_public', false)
      .maybeSingle();

    if (privateData) {
      setPrivateNote(privateData.content);
    }
  };

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('homework_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setAlerts(data);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('homework_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'homework_alerts',
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const savePublicNote = async () => {
    if (!user) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('is_public', true)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('notes')
        .update({ content: publicNote })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          content: publicNote,
          is_public: true,
        });
    }

    setLoading(false);
    toast({
      title: 'Success',
      description: 'Public notes saved',
    });
  };

  const savePrivateNote = async () => {
    if (!user) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_public', false)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('notes')
        .update({ content: privateNote })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          content: privateNote,
          is_public: false,
        });
    }

    setLoading(false);
    toast({
      title: 'Success',
      description: 'Private notes saved',
    });
  };

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className="border-2 border-destructive bg-destructive/5 animate-fade-in"
            >
              <CardContent className="p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">{alert.title}</p>
                  <p className="text-sm">{alert.description}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle>{t.notes}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="public">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="public">{t.publicNotes}</TabsTrigger>
              <TabsTrigger value="private">{t.privateNotes}</TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="space-y-4">
              <Textarea
                value={publicNote}
                onChange={(e) => setPublicNote(e.target.value)}
                placeholder={t.publicNotes}
                className="min-h-[200px]"
                disabled={!isAdmin}
              />
              {isAdmin ? (
                <Button onClick={savePublicNote} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.language === 'ro' ? 'Doar adminii pot edita notițele publice' : 'Only admins can edit public notes'}
                </p>
              )}
            </TabsContent>

            <TabsContent value="private" className="space-y-4">
              <Textarea
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                placeholder={t.privateNotes}
                className="min-h-[200px]"
              />
              <Button onClick={savePrivateNote} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};