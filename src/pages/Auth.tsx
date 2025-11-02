import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

const AVAILABLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#14b8a6', '#f97316', '#a855f7', '#ec4899',
];

export default function Auth() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [privateName, setPrivateName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [usedColors, setUsedColors] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadUsedColors();
  }, []);

  const loadUsedColors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('chat_color');
    
    if (data) {
      setUsedColors(data.map(p => p.chat_color));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName || !privateName || usedColors.includes(selectedColor)) {
      toast({
        title: 'Error',
        description: 'Please fill all fields and select an available color',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (authError) {
      setLoading(false);
      toast({
        title: 'Error',
        description: authError.message,
        variant: 'destructive',
      });
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          display_name: displayName,
          private_name: privateName,
          chat_color: selectedColor,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Create default user role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'user',
      });
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t.schedule}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.login}</TabsTrigger>
              <TabsTrigger value="register">{t.register}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t.email}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t.password}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Loading...' : t.login}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                >
                  {t.signInWithGoogle}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">{t.email}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">{t.password}</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">{t.displayName}</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="private-name">{t.privateName}</Label>
                  <Input
                    id="private-name"
                    value={privateName}
                    onChange={(e) => setPrivateName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.chooseColor}</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map((color) => {
                      const isUsed = usedColors.includes(color);
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                            isSelected ? 'border-primary scale-110' : 'border-transparent'
                          } ${isUsed ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => !isUsed && setSelectedColor(color)}
                          disabled={isUsed}
                        >
                          {isUsed ? (
                            <X className="absolute inset-0 m-auto h-5 w-5 text-white" />
                          ) : isSelected ? (
                            <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : t.createAccount}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                >
                  {t.signInWithGoogle}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}