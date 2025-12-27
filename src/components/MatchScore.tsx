import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';
import type { MatchScore as MatchScoreType } from '../types';

interface MatchScoreProps {
  score: MatchScoreType;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-yellow-500';
  if (score >= 75) return 'text-sats-green';
  if (score >= 60) return 'text-sats-yellow';
  return 'text-sats-red';
}

function getScoreBackground(score: number): string {
  if (score >= 90) return 'bg-yellow-500';
  if (score >= 75) return 'bg-sats-green';
  if (score >= 60) return 'bg-sats-yellow';
  return 'bg-sats-red';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Good';
  return 'Developing';
}

export function MatchScore({
  score,
  size = 'md',
  showBreakdown = true,
}: MatchScoreProps) {
  const [expanded, setExpanded] = useState(false);

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-32 h-32', text: 'text-4xl', label: 'text-base' },
  };

  const circumference = 2 * Math.PI * 45;
  const cappedOverall = Math.min(100, score.overall);
  const strokeDashoffset = circumference - (cappedOverall / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Circular progress */}
      <div className={cn('relative', sizeClasses[size].container)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={getScoreColor(cappedOverall)}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn('font-bold', sizeClasses[size].text, getScoreColor(cappedOverall))}
          >
            {cappedOverall}%
          </span>
          <span className={cn('text-gray-500', sizeClasses[size].label)}>
            Match
          </span>
        </div>
      </div>

      {/* Score label */}
      <div
        className={cn(
          'mt-2 px-3 py-1 rounded-full text-white text-sm font-medium',
          getScoreBackground(cappedOverall)
        )}
      >
        {getScoreLabel(cappedOverall)}
      </div>

      {/* Expandable breakdown */}
      {showBreakdown && (
        <div className="mt-3 w-full">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-full"
          >
            {expanded ? 'Hide' : 'Show'} Breakdown
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 bg-gray-50 rounded-lg p-3">
              <BreakdownBar
                label="Attributes"
                value={Math.min(100, score.breakdown.competencies)}
                weight={`${score.weights?.attributes ?? 40}%`}
              />
              <BreakdownBar
                label="Experiences"
                value={Math.min(100, score.breakdown.experiences)}
                weight={`${score.weights?.experiences ?? 30}%`}
              />
              <BreakdownBar
                label="Skill Proficiency (Tools)"
                value={Math.min(100, score.breakdown.tools)}
                weight={`${score.weights?.skillProficiency ?? 20}%`}
              />
              <BreakdownBar
                label="Cultural Fit"
                value={Math.min(100, score.breakdown.cultural)}
                weight={`${score.weights?.culturalFit ?? 10}%`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight: string;
}) {
  const cappedValue = Math.min(100, value);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>
          {cappedValue}% <span className="text-gray-400">({weight})</span>
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getScoreBackground(cappedValue))}
          style={{ width: `${cappedValue}%` }}
        />
      </div>
    </div>
  );
}
