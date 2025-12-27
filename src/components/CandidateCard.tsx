import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { Eye, EyeOff, Briefcase, Calendar, Edit2, Heart } from 'lucide-react';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';
import type { CandidateProfile, SuccessProfile } from '../types';

interface CandidateCardProps {
  candidate: CandidateProfile;
  successProfile: SuccessProfile;
  isSelected: boolean;
  selectionColor?: string;
  onToggleSelect: () => void;
  onEditScores?: () => void;
  onAssessCulturalFit?: () => void;
}

// Helper to get abbreviated label for mini radar chart
function getAbbreviatedLabel(label: string): string {
  // Create abbreviation from first letters of each word
  const words = label.split(/\s+/);
  if (words.length === 1) {
    return label.substring(0, 2).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase();
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-yellow-500 border-yellow-400';
  if (score >= 75) return 'text-sats-green border-sats-green';
  if (score >= 60) return 'text-sats-yellow border-sats-yellow';
  return 'text-sats-red border-sats-red';
}

function getScoreBackground(score: number): string {
  if (score >= 90) return 'bg-yellow-500';
  if (score >= 75) return 'bg-sats-green';
  if (score >= 60) return 'bg-sats-yellow';
  return 'bg-sats-red';
}

export function CandidateCard({
  candidate,
  successProfile,
  isSelected,
  selectionColor,
  onToggleSelect,
  onEditScores,
  onAssessCulturalFit,
}: CandidateCardProps) {
  // Use attributeConfig for dynamic labels, fall back to competencyStats keys
  const attributeKeys = successProfile.attributeConfig?.length > 0
    ? successProfile.attributeConfig.map(c => c.key)
    : Object.keys(successProfile.competencyStats);

  const data = attributeKeys.map((key) => {
    // Get label from attributeConfig or generate from key
    const config = successProfile.attributeConfig?.find(c => c.key === key);
    const label = config?.label || key;
    return {
      subject: getAbbreviatedLabel(label),
      profile: successProfile.competencyStats[key] || 0,
      candidate: candidate.competencyStats[key] || 0,
      fullMark: 100,
    };
  });

  // Use selection color for border when selected
  const borderStyle = isSelected && selectionColor
    ? { borderColor: selectionColor, boxShadow: `0 10px 15px -3px ${selectionColor}33` }
    : {};

  return (
    <div
      className={cn(
        'bg-white rounded-xl border-2 p-4 transition-all duration-200 relative',
        isSelected
          ? 'shadow-lg'
          : 'border-gray-200 hover:border-gray-300'
      )}
      style={borderStyle}
    >
      {/* Color indicator bar */}
      {isSelected && selectionColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ backgroundColor: selectionColor }}
        />
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            name={candidate.personalInfo.name}
            avatarUrl={candidate.personalInfo.avatarUrl}
            roleClass={candidate.role.class}
            size="sm"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {candidate.personalInfo.name}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {candidate.personalInfo.currentRole}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onAssessCulturalFit && (
            <button
              onClick={onAssessCulturalFit}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium',
                candidate.culturalFitAssessment
                  ? 'bg-sats-purple/10 text-sats-purple hover:bg-sats-purple hover:text-white'
                  : 'bg-sats-orange/10 text-sats-orange hover:bg-sats-orange hover:text-white animate-pulse'
              )}
              title={candidate.culturalFitAssessment ? 'Edit cultural fit assessment' : 'Assess cultural fit'}
            >
              <Heart className={cn('w-4 h-4', candidate.culturalFitAssessment && 'fill-current')} />
              {!candidate.culturalFitAssessment && <span>Assess</span>}
            </button>
          )}
          {onEditScores && (
            <button
              onClick={onEditScores}
              className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-sats-blue hover:text-white transition-colors"
              title="Edit attribute scores"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleSelect}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isSelected
                ? 'text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
            style={isSelected && selectionColor ? { backgroundColor: selectionColor } : {}}
            title={isSelected ? 'Hide from comparison' : 'Show in comparison'}
          >
            {isSelected ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Experience info */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>{candidate.personalInfo.yearsExperience} years experience</span>
      </div>

      {/* Mini radar chart */}
      <div className="h-40 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#D5D7D7" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
            />
            <Radar
              name="Profile"
              dataKey="profile"
              stroke="#30A9CE"
              fill="#30A9CE"
              fillOpacity={0.2}
              strokeWidth={1}
            />
            <Radar
              name="Candidate"
              dataKey="candidate"
              stroke={selectionColor || '#FFA62B'}
              fill={selectionColor || '#FFA62B'}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      {/* Match score */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-sm text-gray-600">Match Score</span>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
              getScoreColor(candidate.matchScore.overall)
            )}
          >
            {candidate.matchScore.overall}
          </div>
          <div
            className={cn(
              'h-2 w-16 rounded-full overflow-hidden bg-gray-200'
            )}
          >
            <div
              className={cn(
                'h-full rounded-full',
                getScoreBackground(candidate.matchScore.overall)
              )}
              style={{ width: `${candidate.matchScore.overall}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Attributes</div>
          <div className="font-semibold text-sats-blue">
            {candidate.matchScore.breakdown.competencies}%
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Experience</div>
          <div className="font-semibold text-sats-green">
            {candidate.matchScore.breakdown.experiences}%
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Skills</div>
          <div className="font-semibold text-sats-purple">
            {candidate.matchScore.breakdown.tools}%
          </div>
        </div>
        {onAssessCulturalFit && !candidate.culturalFitAssessment ? (
          <button
            onClick={onAssessCulturalFit}
            className="text-center p-2 bg-sats-orange/10 rounded border border-dashed border-sats-orange/30 hover:bg-sats-orange/20 transition-colors cursor-pointer"
            title="Click to assess cultural fit"
          >
            <div className="text-xs text-sats-orange">Cultural</div>
            <div className="text-xs font-medium text-sats-orange">
              Assess →
            </div>
          </button>
        ) : (
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-500">Cultural</div>
            <div className={cn(
              'font-semibold',
              candidate.culturalFitAssessment ? 'text-sats-orange' : 'text-gray-400'
            )}>
              {candidate.matchScore.breakdown.cultural}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
