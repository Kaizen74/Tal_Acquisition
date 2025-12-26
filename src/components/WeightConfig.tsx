import { useState, useEffect } from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

export interface MatchWeights {
  attributes: number;
  experiences: number;
  skillProficiency: number;
  culturalFit: number;
}

interface WeightConfigProps {
  weights: MatchWeights;
  onWeightsChange: (weights: MatchWeights) => void;
  className?: string;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  attributes: 40,
  experiences: 30,
  skillProficiency: 20,
  culturalFit: 10,
};

const WEIGHT_LABELS: Record<keyof MatchWeights, string> = {
  attributes: 'Attributes',
  experiences: 'Experiences',
  skillProficiency: 'Skill Proficiency',
  culturalFit: 'Cultural Fit',
};

const WEIGHT_COLORS: Record<keyof MatchWeights, string> = {
  attributes: 'bg-sats-orange',
  experiences: 'bg-sats-green',
  skillProficiency: 'bg-sats-yellow',
  culturalFit: 'bg-sats-blue',
};

export function WeightConfig({ weights, onWeightsChange, className }: WeightConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localWeights, setLocalWeights] = useState<MatchWeights>(weights);

  useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  const totalWeight = Object.values(localWeights).reduce((sum, w) => sum + w, 0);
  const isValid = totalWeight === 100;

  const handleWeightChange = (key: keyof MatchWeights, value: number) => {
    const newWeights = { ...localWeights, [key]: value };
    setLocalWeights(newWeights);

    // Only apply if total is 100%
    const newTotal = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (newTotal === 100) {
      onWeightsChange(newWeights);
    }
  };

  const resetToDefaults = () => {
    setLocalWeights(DEFAULT_WEIGHTS);
    onWeightsChange(DEFAULT_WEIGHTS);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sats-purple" />
          <span className="font-medium text-gray-900 text-sm">Match Score Weights</span>
        </div>
        <div className="flex items-center gap-2">
          {!isValid && (
            <span className="text-xs text-sats-red">Total: {totalWeight}%</span>
          )}
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isExpanded ? 'bg-sats-purple/10 text-sats-purple' : 'bg-gray-100 text-gray-500'
          )}>
            {isExpanded ? 'Collapse' : 'Configure'}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Weight summary bar */}
          <div className="mt-3 mb-4">
            <div className="h-3 rounded-full overflow-hidden flex">
              {(Object.keys(localWeights) as Array<keyof MatchWeights>).map((key) => (
                <div
                  key={key}
                  className={cn('transition-all duration-200', WEIGHT_COLORS[key])}
                  style={{ width: `${localWeights[key]}%` }}
                  title={`${WEIGHT_LABELS[key]}: ${localWeights[key]}%`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className={cn('text-xs', isValid ? 'text-gray-500' : 'text-sats-red')}>
                Total: {totalWeight}%
              </span>
              {!isValid && (
                <span className="text-xs text-sats-red">Must equal 100%</span>
              )}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {(Object.keys(localWeights) as Array<keyof MatchWeights>).map((key) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-700">{WEIGHT_LABELS[key]}</label>
                  <span className="text-sm font-medium text-gray-900">{localWeights[key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localWeights[key]}
                  onChange={(e) => handleWeightChange(key, parseInt(e.target.value, 10))}
                  className={cn(
                    'w-full h-2 rounded-lg appearance-none cursor-pointer',
                    'bg-gray-200',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:w-4',
                    '[&::-webkit-slider-thumb]:h-4',
                    '[&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:cursor-pointer',
                    key === 'attributes' && '[&::-webkit-slider-thumb]:bg-sats-orange',
                    key === 'experiences' && '[&::-webkit-slider-thumb]:bg-sats-green',
                    key === 'skillProficiency' && '[&::-webkit-slider-thumb]:bg-sats-yellow',
                    key === 'culturalFit' && '[&::-webkit-slider-thumb]:bg-sats-blue',
                  )}
                />
              </div>
            ))}
          </div>

          {/* Reset button */}
          <button
            onClick={resetToDefaults}
            className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_WEIGHTS };
