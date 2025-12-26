import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { Eye, EyeOff, Briefcase, Calendar } from 'lucide-react';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';
import type { CandidateProfile, CompetencyStats, SuccessProfile } from '../types';

interface CandidateCardProps {
  candidate: CandidateProfile;
  successProfile: SuccessProfile;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const statLabels: Record<keyof CompetencyStats, string> = {
  problemSolving: 'PS',
  stakeholderManagement: 'SM',
  technicalExpertise: 'TE',
  leadership: 'L',
  customerFocus: 'CF',
  adaptability: 'A',
};

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
  onToggleSelect,
}: CandidateCardProps) {
  const data = (
    Object.keys(successProfile.competencyStats) as Array<keyof CompetencyStats>
  ).map((key) => ({
    subject: statLabels[key],
    profile: successProfile.competencyStats[key],
    candidate: candidate.competencyStats[key],
    fullMark: 100,
  }));

  return (
    <div
      className={cn(
        'bg-white rounded-xl border-2 p-4 transition-all duration-200',
        isSelected
          ? 'border-sats-blue shadow-lg shadow-sats-blue/20'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
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
        <button
          onClick={onToggleSelect}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isSelected
              ? 'bg-sats-blue text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          )}
          title={isSelected ? 'Hide from comparison' : 'Show in comparison'}
        >
          {isSelected ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
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
              stroke="#FFA62B"
              fill="#FFA62B"
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
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Competencies</div>
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
      </div>
    </div>
  );
}
