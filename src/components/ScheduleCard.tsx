import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ScheduleCardProps {
  day: string;
  dayIndex: number;
  items: Array<{
    subject: string;
    time_slot: string;
    teacher?: string;
    room?: string;
  }>;
  className?: string;
}

const dayColors = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const ScheduleCard = ({ day, dayIndex, items, className }: ScheduleCardProps) => {
  const colorClass = dayColors[dayIndex];

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:scale-[1.02] animate-scale-in',
        className
      )}
      style={{ borderColor: `hsl(var(--${colorClass}))` }}
    >
      <CardHeader
        className="py-3"
        style={{
          backgroundColor: `hsl(var(--${colorClass}) / 0.2)`,
          borderBottom: `2px solid hsl(var(--${colorClass}))`,
        }}
      >
        <CardTitle className="text-lg font-bold">{day}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No classes scheduled</p>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className="py-2 border-b border-border last:border-0"
            >
              <p className="font-medium">{item.subject}</p>
              <p className="text-sm text-muted-foreground">{item.time_slot}</p>
              {item.teacher && (
                <p className="text-xs text-muted-foreground">{item.teacher}</p>
              )}
              {item.room && (
                <p className="text-xs text-muted-foreground">Room: {item.room}</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};