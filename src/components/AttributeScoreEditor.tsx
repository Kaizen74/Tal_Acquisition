import { useState } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import type { CandidateProfile, AttributeConfig } from '../types';
import { cn } from '../utils/cn';

interface AttributeScoreEditorProps {
  candidate: CandidateProfile;
  profileAttributeConfig: AttributeConfig[];
  onSave: (updatedCandidate: CandidateProfile) => void;
  onClose: () => void;
}

export function AttributeScoreEditor({
  candidate,
  profileAttributeConfig,
  onSave,
  onClose,
}: AttributeScoreEditorProps) {
  // Local state for editing - use profile's attributeConfig as the source of attribute keys/labels
  const [editedStats, setEditedStats] = useState<Record<string, number>>(() => {
    // Initialize with candidate's current stats
    const stats: Record<string, number> = {};
    profileAttributeConfig.forEach((attr) => {
      stats[attr.key] = candidate.competencyStats[attr.key] || 0;
    });
    return stats;
  });

  // Original values for reset
  const [originalStats] = useState<Record<string, number>>(() => {
    const stats: Record<string, number> = {};
    profileAttributeConfig.forEach((attr) => {
      stats[attr.key] = candidate.competencyStats[attr.key] || 0;
    });
    return stats;
  });

  const handleSliderChange = (key: string, value: number) => {
    setEditedStats((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleInputChange = (key: string, inputValue: string) => {
    const value = Math.min(100, Math.max(0, parseInt(inputValue, 10) || 0));
    setEditedStats((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setEditedStats({ ...originalStats });
  };

  const handleSave = () => {
    // Build updated candidate with new stats
    const updatedCandidate: CandidateProfile = {
      ...candidate,
      competencyStats: { ...editedStats },
      // Update attributeConfig to match new values
      attributeConfig: profileAttributeConfig.map((attr) => ({
        key: attr.key,
        label: attr.label,
        value: editedStats[attr.key] || 0,
      })),
    };
    onSave(updatedCandidate);
    onClose();
  };

  const hasChanges = Object.keys(editedStats).some(
    (key) => editedStats[key] !== originalStats[key]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Edit Attribute Scores
            </h3>
            <p className="text-sm text-gray-500">
              {candidate.personalInfo.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Score sliders */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {profileAttributeConfig.map((attr) => (
            <div key={attr.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {attr.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editedStats[attr.key] || 0}
                    onChange={(e) => handleInputChange(attr.key, e.target.value)}
                    className="w-16 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sats-blue"
                  />
                  <span className="text-sm text-gray-400">/ 100</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editedStats[attr.key] || 0}
                  onChange={(e) => handleSliderChange(attr.key, parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sats-blue"
                />
              </div>
              {/* Visual indicator of change */}
              {editedStats[attr.key] !== originalStats[attr.key] && (
                <p className="text-xs text-sats-orange">
                  Changed from {originalStats[attr.key]} to {editedStats[attr.key]}
                </p>
              )}
            </div>
          ))}
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
