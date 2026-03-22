'use client';

import { useState } from 'react';

interface UVAProgressProps {
  userWeeklyKgSaved?: number;
}

export default function UVAProgress({ userWeeklyKgSaved = 0 }: UVAProgressProps) {
  const [expanded, setExpanded] = useState(false);

  const UVA_ANNUAL_SCOPE3_COMMUTE_TONNES = 15000;
  const userAnnualKgProjected = userWeeklyKgSaved * 52;
  const userAnnualTonnes = userAnnualKgProjected / 1000;
  const userContributionPct = parseFloat(
    ((userAnnualTonnes / UVA_ANNUAL_SCOPE3_COMMUTE_TONNES) * 100).toFixed(3)
  );

  const overallProgressPct = 55;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="bg-uva-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎓</span>
          <span className="font-semibold text-white text-sm tracking-wide">
            UVA 2030 Climate Action Plan
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/70 hover:text-white text-xs transition-colors"
          aria-label={expanded ? 'Collapse info' : 'Learn more'}
        >
          {expanded ? '▲ less' : '▼ more'}
        </button>
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs text-slate-500 font-medium">
              Scope 1 &amp; 2 reduction progress
            </span>
            <span className="text-sm font-bold text-uva-primary">
              ~{overallProgressPct}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-uva-primary to-uva-accent"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Target: carbon neutral by 2030 · UVA beat its last goal 6 years early
          </p>
        </div>

        {userWeeklyKgSaved > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
            <p className="text-xs text-green-700">
              Your trips ≈ <span className="font-bold">{userContributionPct}%</span> of UVA&apos;s annual commuter carbon
            </p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="pt-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm">📋</span>
              <div className="text-xs">
                <span className="font-bold text-uva-primary uppercase tracking-wide">The goal: </span>
                <span className="text-slate-600">Net-zero Scope 1 &amp; 2 by 2030; fossil-fuel-free by 2050</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm">🚌</span>
              <div className="text-xs">
                <span className="font-bold text-uva-primary uppercase tracking-wide">Commuting (Scope 3): </span>
                <span className="text-slate-600">Tracked jointly with Charlottesville &amp; Albemarle County — your trips feed this data</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm">📉</span>
              <div className="text-xs">
                <span className="font-bold text-uva-primary uppercase tracking-wide">Already achieved: </span>
                <span className="text-slate-600">27% GHG reduction by 2019 — 6 years ahead of schedule</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm">🆓</span>
              <div className="text-xs">
                <span className="font-bold text-uva-primary uppercase tracking-wide">UTS buses: </span>
                <span className="text-slate-600">Free for all UVA students, faculty &amp; staff — zero fare, 44 gCO₂e/mile</span>
              </div>
            </div>
            <div className="mt-3 bg-uva-primary rounded-md px-3 py-2">
              <p className="text-xs text-white/90 italic leading-relaxed">
                &ldquo;Every trip logged here contributes to UVA&apos;s regional Scope 3 commuting inventory — the data that drives institutional policy.&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
