import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { EditProfileDialog } from './EditProfileDialog';
import { NotificationBell } from './NotificationBell';
import { ChatButton } from './ChatButton';
import { ContactsButton } from './ContactsButton';
import { useIsMobile } from '@/hooks/use-mobile';

export const Navbar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">{t.schedule}</h1>
        
        <div className="flex items-center gap-2">
          {user && (
            <>
              <NotificationBell />
              <ContactsButton />
              {isMobile && <ChatButton />}
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card/95 backdrop-blur-lg">
            <SheetHeader>
              <SheetTitle>{t.menu}</SheetTitle>
            </SheetHeader>
            
            <div className="mt-8 space-y-4">
              {user && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setEditProfileOpen(true);
                    setOpen(false);
                  }}
                >
                  {t.editProfile}
                </Button>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium">{t.theme}</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    {t.light}
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    {t.dark}
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                  >
                    {t.system}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t.language}</p>
                <div className="flex gap-2">
                  <Button
                    variant={language === 'ro' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLanguage('ro')}
                  >
                    RO
                  </Button>
                  <Button
                    variant={language === 'en' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLanguage('en')}
                  >
                    EN
                  </Button>
                </div>
              </div>

              {user && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                >
                  {t.logout}
                </Button>
              )}
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>

      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} />
    </nav>
  );
};