import { useState } from 'react';
import { X, Save, Plus, Trash2, TrendingUp, AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

interface CulturalFitConfigProps {
  motivations: string[];
  painPoints: string[];
  onSave: (motivations: string[], painPoints: string[]) => void;
  onClose: () => void;
}

export function CulturalFitConfig({
  motivations: initialMotivations,
  painPoints: initialPainPoints,
  onSave,
  onClose,
}: CulturalFitConfigProps) {
  const [motivations, setMotivations] = useState<string[]>([...initialMotivations]);
  const [painPoints, setPainPoints] = useState<string[]>([...initialPainPoints]);
  const [newMotivation, setNewMotivation] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');

  const [originalMotivations] = useState<string[]>([...initialMotivations]);
  const [originalPainPoints] = useState<string[]>([...initialPainPoints]);

  const hasChanges =
    JSON.stringify(motivations) !== JSON.stringify(originalMotivations) ||
    JSON.stringify(painPoints) !== JSON.stringify(originalPainPoints);

  const handleAddMotivation = () => {
    if (newMotivation.trim()) {
      setMotivations([...motivations, newMotivation.trim()]);
      setNewMotivation('');
    }
  };

  const handleAddPainPoint = () => {
    if (newPainPoint.trim()) {
      setPainPoints([...painPoints, newPainPoint.trim()]);
      setNewPainPoint('');
    }
  };

  const handleRemoveMotivation = (index: number) => {
    setMotivations(motivations.filter((_, i) => i !== index));
  };

  const handleRemovePainPoint = (index: number) => {
    setPainPoints(painPoints.filter((_, i) => i !== index));
  };

  const handleEditMotivation = (index: number, value: string) => {
    const updated = [...motivations];
    updated[index] = value;
    setMotivations(updated);
  };

  const handleEditPainPoint = (index: number, value: string) => {
    const updated = [...painPoints];
    updated[index] = value;
    setPainPoints(updated);
  };

  const handleReset = () => {
    setMotivations([...originalMotivations]);
    setPainPoints([...originalPainPoints]);
    setNewMotivation('');
    setNewPainPoint('');
  };

  const handleSave = () => {
    // Filter out empty strings
    const cleanMotivations = motivations.filter(m => m.trim());
    const cleanPainPoints = painPoints.filter(p => p.trim());
    onSave(cleanMotivations, cleanPainPoints);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-sats-green/10 to-sats-red/10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configure Cultural Fit Criteria
            </h3>
            <p className="text-sm text-gray-500">
              Define motivations and pain points for candidate assessment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Motivations Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-sats-green" />
              <h4 className="text-sm font-semibold text-gray-700">
                Role Motivations
              </h4>
              <span className="text-xs text-gray-400">({motivations.length})</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              What motivates an ideal candidate for this role? These will be used to assess cultural fit.
            </p>

            {/* Existing motivations */}
            <div className="space-y-2 mb-3">
              {motivations.map((motivation, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-sats-green/5 border border-sats-green/20 rounded-lg group"
                >
                  <span className="text-sats-green">+</span>
                  <input
                    type="text"
                    value={motivation}
                    onChange={(e) => handleEditMotivation(index, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-sats-green/50 rounded px-1"
                  />
                  <button
                    onClick={() => handleRemoveMotivation(index)}
                    className="p-1 text-gray-400 hover:text-sats-red opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove motivation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new motivation */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMotivation}
                onChange={(e) => setNewMotivation(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddMotivation)}
                placeholder="Add a new motivation..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sats-green/50"
              />
              <button
                onClick={handleAddMotivation}
                disabled={!newMotivation.trim()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  newMotivation.trim()
                    ? 'bg-sats-green text-white hover:bg-sats-green/90'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Pain Points Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-sats-red" />
              <h4 className="text-sm font-semibold text-gray-700">
                Role Challenges (Pain Points)
              </h4>
              <span className="text-xs text-gray-400">({painPoints.length})</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              What challenges or pain points should candidates understand? Used to assess their readiness.
            </p>

            {/* Existing pain points */}
            <div className="space-y-2 mb-3">
              {painPoints.map((painPoint, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-sats-red/5 border border-sats-red/20 rounded-lg group"
                >
                  <span className="text-sats-red">!</span>
                  <input
                    type="text"
                    value={painPoint}
                    onChange={(e) => handleEditPainPoint(index, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-sats-red/50 rounded px-1"
                  />
                  <button
                    onClick={() => handleRemovePainPoint(index)}
                    className="p-1 text-gray-400 hover:text-sats-red opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove pain point"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new pain point */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPainPoint}
                onChange={(e) => setNewPainPoint(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddPainPoint)}
                placeholder="Add a new challenge/pain point..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sats-red/50"
              />
              <button
                onClick={handleAddPainPoint}
                disabled={!newPainPoint.trim()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  newPainPoint.trim()
                    ? 'bg-sats-red text-white hover:bg-sats-red/90'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> These criteria will be used when assessing candidate cultural fit.
              Candidates will be rated on each motivation and pain point during the assessment process.
            </p>
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
              disabled={!hasChanges}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                hasChanges
                  ? 'bg-sats-blue text-white hover:bg-sats-blue/90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
