import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { ContactsDialog } from './ContactsDialog';
import { PrivateChatDialog } from './PrivateChatDialog';

export const ContactsButton = () => {
  const [contactsOpen, setContactsOpen] = useState(false);
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setPrivateChatOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setContactsOpen(true)}
      >
        <Users className="h-5 w-5" />
      </Button>

      <ContactsDialog
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onSelectUser={handleSelectUser}
      />

      <PrivateChatDialog
        open={privateChatOpen}
        onOpenChange={setPrivateChatOpen}
        recipientId={selectedUserId}
      />
    </>
  );
};
