import {
  Users,
  Headphones,
  TrendingUp,
  RefreshCw,
  Globe,
  BarChart3,
  Award,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { RequiredExperience } from '../types';

interface ExperienceBadgesProps {
  experiences: RequiredExperience[];
  candidateExperiences?: RequiredExperience[];
}

const iconMap: Record<string, React.ElementType> = {
  Users,
  Headphones,
  TrendingUp,
  RefreshCw,
  Languages: Globe,
  BarChart3,
  Award,
};

function getBadgeStatus(
  exp: RequiredExperience,
  candidateExp?: RequiredExperience
): 'achieved' | 'missing' | 'partial' {
  if (!candidateExp) {
    return exp.achieved ? 'achieved' : 'missing';
  }
  return candidateExp.achieved ? 'achieved' : 'missing';
}

export function ExperienceBadges({
  experiences,
  candidateExperiences,
}: ExperienceBadgesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {experiences.map((exp, index) => {
        const candidateExp = candidateExperiences?.[index];
        const status = getBadgeStatus(exp, candidateExp);
        const IconComponent = iconMap[exp.badgeIcon] || Award;

        return (
          <div
            key={`${exp.name}-${index}`}
            className="group relative"
          >
            <div
              className={cn(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200',
                status === 'achieved' && 'bg-sats-green/10 border-sats-green',
                status === 'missing' && 'bg-gray-100 border-gray-300 grayscale',
                status === 'partial' && 'bg-sats-yellow/10 border-sats-yellow'
              )}
            >
              {/* Badge icon */}
              <div
                className={cn(
                  'relative w-12 h-12 rounded-full flex items-center justify-center mb-2',
                  status === 'achieved' && 'bg-sats-green text-white',
                  status === 'missing' && 'bg-gray-400 text-white',
                  status === 'partial' && 'bg-sats-yellow text-white'
                )}
              >
                <IconComponent className="w-6 h-6" />

                {/* Status overlay */}
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                    status === 'achieved' && 'bg-white text-sats-green',
                    status === 'missing' && 'bg-white text-red-500',
                    status === 'partial' && 'bg-white text-sats-yellow'
                  )}
                >
                  {status === 'achieved' && <CheckCircle className="w-4 h-4" />}
                  {status === 'missing' && <XCircle className="w-4 h-4" />}
                  {status === 'partial' && <Clock className="w-4 h-4" />}
                </div>
              </div>

              {/* Badge info */}
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {exp.category}
              </span>
              <span className="text-sm font-medium text-gray-900 text-center">
                {exp.name}
              </span>
              <span className="text-xs text-gray-500">
                {exp.minYears}+ years
              </span>
            </div>

            {/* Hover tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                {exp.name}
              </h4>
              <p className="text-xs text-gray-600 mb-2">{exp.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Required: {exp.minYears}+ years</span>
                <span
                  className={cn(
                    'font-medium',
                    status === 'achieved' && 'text-sats-green',
                    status === 'missing' && 'text-red-500',
                    status === 'partial' && 'text-sats-yellow'
                  )}
                >
                  {status === 'achieved' && 'Achieved'}
                  {status === 'missing' && 'Missing'}
                  {status === 'partial' && 'Partial'}
                </span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
