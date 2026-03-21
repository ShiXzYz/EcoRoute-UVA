'use client';

interface StreakDisplayProps {
  streak: number;
}

export default function StreakDisplay({ streak }: StreakDisplayProps) {
  const isDaySevenMilestone = streak % 7 === 0 && streak > 0;

  return (
    <div className={`p-4 rounded-lg border-2 ${
      isDaySevenMilestone 
        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500' 
        : 'bg-green-50 border-green-500'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Your Green Streak</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{streak} days</p>
          {isDaySevenMilestone && (
            <p className="text-xs text-amber-600 font-semibold mt-2">🏆 Milestone reached! You&apos;re a Green Hoo!</p>
          )}
        </div>
        <div className="text-5xl">{isDaySevenMilestone ? '🏆' : '🔥'}</div>
      </div>
    </div>
  );
}
