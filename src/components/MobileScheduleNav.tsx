import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileScheduleNavProps {
  selectedDay: number;
  onDaySelect: (day: number) => void;
}

const dayColors = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const MobileScheduleNav = ({ selectedDay, onDaySelect }: MobileScheduleNavProps) => {
  const { t } = useLanguage();
  const days = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-2 flex gap-2 md:hidden z-40">
      {days.map((day, index) => {
        const colorClass = dayColors[index];
        const isSelected = selectedDay === index;
        
        return (
          <Button
            key={index}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className="flex-1 transition-all"
            style={
              isSelected
                ? { backgroundColor: `hsl(var(--${colorClass}))`, color: 'white' }
                : { borderColor: `hsl(var(--${colorClass}))` }
            }
            onClick={() => onDaySelect(index)}
          >
            {day.substring(0, 3)}
          </Button>
        );
      })}
    </div>
  );
};