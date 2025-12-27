import { useState } from 'react';
import { X, Save, RotateCcw, Star, TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react';
import type { CandidateProfile, CulturalFitAssessment as CulturalFitAssessmentType } from '../types';
import { cn } from '../utils/cn';

interface CulturalFitAssessmentProps {
  candidate: CandidateProfile;
  motivations: string[];
  painPoints: string[];
  onSave: (assessment: CulturalFitAssessmentType) => void;
  onClose: () => void;
}

// Rating labels for 1-5 scale
const ratingLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Below Avg',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          className={cn(
            'p-0.5 transition-colors',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          <Star
            className={cn(
              'w-5 h-5 transition-colors',
              star <= displayValue
                ? 'text-sats-yellow fill-sats-yellow'
                : 'text-gray-300'
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-xs text-gray-500 w-16">
        {displayValue > 0 ? ratingLabels[displayValue] : 'Not rated'}
      </span>
    </div>
  );
}

export function CulturalFitAssessment({
  candidate,
  motivations,
  painPoints,
  onSave,
  onClose,
}: CulturalFitAssessmentProps) {
  // All criteria: motivations + pain points
  const allCriteria = [
    ...motivations.map((m) => ({ type: 'motivation' as const, text: m })),
    ...painPoints.map((p) => ({ type: 'painpoint' as const, text: p })),
  ];

  // Initialize ratings from existing assessment or defaults
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    allCriteria.forEach((c) => {
      const existing = candidate.culturalFitAssessment?.criteriaRatings?.find(
        (r) => r.criterion === c.text
      );
      initial[c.text] = existing?.rating || 0;
    });
    return initial;
  });

  const [notes, setNotes] = useState<string>(
    candidate.culturalFitAssessment?.notes || ''
  );

  const [originalRatings] = useState<Record<string, number>>({ ...ratings });
  const [originalNotes] = useState<string>(notes);

  // Calculate overall score from ratings (convert 1-5 scale to 0-100)
  const calculateOverallScore = (): number => {
    const ratedCriteria = Object.values(ratings).filter((r) => r > 0);
    if (ratedCriteria.length === 0) return 0;
    const avgRating = ratedCriteria.reduce((sum, r) => sum + r, 0) / ratedCriteria.length;
    return Math.round((avgRating / 5) * 100);
  };

  const handleRatingChange = (criterion: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [criterion]: value,
    }));
  };

  const handleReset = () => {
    setRatings({ ...originalRatings });
    setNotes(originalNotes);
  };

  const handleSave = () => {
    const assessment: CulturalFitAssessmentType = {
      score: calculateOverallScore(),
      assessedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      criteriaRatings: allCriteria
        .filter((c) => ratings[c.text] > 0)
        .map((c) => ({
          criterion: c.text,
          rating: ratings[c.text],
        })),
    };
    onSave(assessment);
    onClose();
  };

  const hasChanges =
    JSON.stringify(ratings) !== JSON.stringify(originalRatings) ||
    notes !== originalNotes;

  const ratedCount = Object.values(ratings).filter((r) => r > 0).length;
  const totalCriteria = allCriteria.length;
  const overallScore = calculateOverallScore();

  // Check if there are criteria to rate
  if (allCriteria.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cultural Fit Assessment</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-sats-yellow mx-auto mb-3" />
            <p className="text-gray-600">
              No motivations or pain points defined in the success profile.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Upload a success profile with motivations and pain points to enable cultural fit assessment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-sats-purple/10 to-sats-blue/10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Cultural Fit Assessment
            </h3>
            <p className="text-sm text-gray-500">
              {candidate.personalInfo.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Score preview */}
            <div className="text-right">
              <div className="text-2xl font-bold text-sats-purple">{overallScore}%</div>
              <div className="text-xs text-gray-500">
                {ratedCount}/{totalCriteria} rated
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Rating sections */}
        <div className="p-4 overflow-y-auto max-h-[55vh] space-y-6">
          {/* Motivations section */}
          {motivations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-sats-green" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Alignment with Role Motivations
                </h4>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Rate how well the candidate aligns with each motivation based on your interview or screening.
              </p>
              <div className="space-y-3">
                {motivations.map((motivation) => (
                  <div
                    key={motivation}
                    className="flex items-center justify-between p-3 bg-sats-green/5 border border-sats-green/20 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 flex-1 pr-4">{motivation}</span>
                    <StarRating
                      value={ratings[motivation] || 0}
                      onChange={(value) => handleRatingChange(motivation, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pain Points section */}
          {painPoints.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-sats-red" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Understanding of Role Challenges
                </h4>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Rate how well the candidate understands and can handle these challenges.
              </p>
              <div className="space-y-3">
                {painPoints.map((painPoint) => (
                  <div
                    key={painPoint}
                    className="flex items-center justify-between p-3 bg-sats-red/5 border border-sats-red/20 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 flex-1 pr-4">{painPoint}</span>
                    <StarRating
                      value={ratings[painPoint] || 0}
                      onChange={(value) => handleRatingChange(painPoint, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-sats-blue" />
              <h4 className="text-sm font-semibold text-gray-700">
                Assessment Notes
              </h4>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations from the interview or screening..."
              className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sats-blue/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              hasChanges
                ? 'text-gray-700 hover:bg-gray-200'
                : 'text-gray-400 cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={ratedCount === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                ratedCount > 0
                  ? 'bg-sats-purple text-white hover:bg-sats-purple/90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              Save Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
