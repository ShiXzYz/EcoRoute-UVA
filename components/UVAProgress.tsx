'use client';

export default function UVAProgress() {
  return (
    <div className="bg-gradient-to-r from-uva-primary to-uva-accent text-white p-4 rounded-lg shadow-md">
      <p className="font-semibold text-sm mb-2">🎓 UVA 2030 Climate Goal</p>
      <p className="text-xs mb-3 opacity-90">
        UVA commits to net-zero Scope 3 emissions by 2030. Your green trips contribute to 
        reducing campus commuting carbon.
      </p>
      
      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-2 mb-2">
        <div 
          className="bg-white h-2 rounded-full transition-all"
          style={{ width: '35%' }}
        />
      </div>
      <p className="text-xs opacity-90">35% toward 2030 goal</p>
    </div>
  );
}
