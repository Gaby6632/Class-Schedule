import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { ScheduleCard } from '@/components/ScheduleCard';
import { NotesSection } from '@/components/NotesSection';
import { ChatButton } from '@/components/ChatButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileScheduleNav } from '@/components/MobileScheduleNav';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadSchedule();
    }
  }, [user]);

  const loadSchedule = async () => {
    const { data } = await supabase
      .from('schedule_items')
      .select('*')
      .order('day_of_week')
      .order('order_index');

    if (data) {
      setScheduleItems(data);
    }
  };

  const days = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday];

  const getItemsForDay = (dayIndex: number) => {
    return scheduleItems.filter(item => item.day_of_week === dayIndex + 1);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-20 pb-8">
        <h2 className="text-3xl font-bold mb-6 text-center">{t.schedule}</h2>
        
        {/* Desktop Schedule Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {days.map((day, index) => (
            <ScheduleCard
              key={index}
              day={day}
              dayIndex={index}
              items={getItemsForDay(index)}
            />
          ))}
        </div>

        {/* Mobile Schedule - Single Card View */}
        <div className="md:hidden mb-8">
          <ScheduleCard
            day={days[selectedDay]}
            dayIndex={selectedDay}
            items={getItemsForDay(selectedDay)}
            className="animate-slide-up"
          />
        </div>

        <NotesSection />
      </main>

      <MobileScheduleNav selectedDay={selectedDay} onDaySelect={setSelectedDay} />
      {!isMobile && <ChatButton />}

      <footer className="fixed bottom-0 left-0 right-0 bg-transparent text-center py-2 text-xs text-muted-foreground">
        {t.createdBy}
      </footer>
    </div>
  );
};

export default Index;
