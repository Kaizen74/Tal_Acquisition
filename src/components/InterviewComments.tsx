import { useState } from 'react';
import { X, Save, MessageSquare, RotateCcw } from 'lucide-react';
import type { CandidateProfile } from '../types';
import { cn } from '../utils/cn';

interface InterviewCommentsProps {
  candidate: CandidateProfile;
  onSave: (comments: string) => void;
  onClose: () => void;
}

export function InterviewComments({
  candidate,
  onSave,
  onClose,
}: InterviewCommentsProps) {
  const [comments, setComments] = useState<string>(candidate.interviewComments || '');
  const [originalComments] = useState<string>(candidate.interviewComments || '');

  const hasChanges = comments !== originalComments;

  const handleReset = () => {
    setComments(originalComments);
  };

  const handleSave = () => {
    onSave(comments.trim());
    onClose();
  };

  const wordCount = comments.trim() ? comments.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-sats-blue/10 to-sats-purple/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sats-blue/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-sats-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Interview Comments
              </h3>
              <p className="text-sm text-gray-500">
                {candidate.personalInfo.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Notes & Observations
            </label>
            <span className="text-xs text-gray-400">
              {wordCount} words
            </span>
          </div>

          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add your interview notes, observations, and comments about this candidate...

Examples:
• Key strengths observed during interview
• Areas of concern or development needs
• Cultural fit observations
• Communication style and presentation
• Follow-up questions or next steps
• Overall impression and recommendation"
            className="w-full h-64 p-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sats-blue/50 resize-none"
          />

          {/* Info box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> These comments are for documentation purposes only and do not affect the candidate's match score. They will be included in the PDF export report.
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-sats-blue text-white rounded-lg hover:bg-sats-blue/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Comments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
