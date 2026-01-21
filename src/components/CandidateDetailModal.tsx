/**
 * CandidateDetailModal - Full detail view for a candidate
 * Shows all candidate information from CSV upload or resume parsing
 */

import {
  X,
  User,
  Briefcase,
  Award,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  MessageSquare,
  Star,
  BarChart3,
  FileText,
} from 'lucide-react';
import type { CandidateProfile } from '../types';
import { cn } from '../utils/cn';

interface CandidateDetailModalProps {
  candidate: CandidateProfile;
  onClose: () => void;
}

export function CandidateDetailModal({ candidate, onClose }: CandidateDetailModalProps) {
  // Calculate match score percentage for display
  const matchScore = candidate.matchScore?.overall || 0;

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-100 border-green-300';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent Match';
    if (score >= 50) return 'Good Match';
    return 'Needs Review';
  };

  // Calculate experience achievements
  const achievedExperiences = candidate.requiredExperiences?.filter(e => e.achieved) || [];
  const totalExperiences = candidate.requiredExperiences?.length || 0;

  // Calculate skills achievements
  const allTools = candidate.toolbox?.flatMap(cat => cat.tools) || [];
  const achievedTools = allTools.filter(t => t.achieved);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {candidate.personalInfo.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{candidate.personalInfo.name}</h2>
              <p className="text-indigo-100">{candidate.personalInfo.currentRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Match Score Badge */}
            <div className={cn(
              'px-4 py-2 rounded-lg border-2 font-bold text-lg',
              getScoreColor(matchScore)
            )}>
              {matchScore}% Match
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Info */}
              <section className="bg-gray-50 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <User className="w-5 h-5 text-indigo-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="font-medium text-gray-900">{candidate.personalInfo.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Current Role</label>
                    <p className="font-medium text-gray-900">{candidate.personalInfo.currentRole}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Years Experience</label>
                    <p className="font-medium text-gray-900">{candidate.personalInfo.yearsExperience} years</p>
                  </div>
                  {candidate.academicBackground?.minDegree && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Education</label>
                      <p className="font-medium text-gray-900">{candidate.academicBackground.minDegree}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Match Score Breakdown */}
              <section className="bg-gray-50 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Match Score Breakdown
                </h3>
                <div className="space-y-3">
                  {/* Overall Score */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium">Overall Match</span>
                    </div>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-sm font-semibold',
                      getScoreColor(matchScore)
                    )}>
                      {matchScore}% - {getScoreLabel(matchScore)}
                    </span>
                  </div>

                  {candidate.matchScore?.breakdown && (
                    <>
                      {/* Competencies */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-gray-700">Attributes</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${candidate.matchScore.breakdown.competencies}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {candidate.matchScore.breakdown.competencies}%
                          </span>
                        </div>
                      </div>

                      {/* Experiences */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-gray-700">Experiences</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${candidate.matchScore.breakdown.experiences}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {candidate.matchScore.breakdown.experiences}%
                          </span>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-gray-700">Skill Proficiency</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full"
                              style={{ width: `${candidate.matchScore.breakdown.tools}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {candidate.matchScore.breakdown.tools}%
                          </span>
                        </div>
                      </div>

                      {/* Cultural Fit */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-gray-700">Cultural Fit</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${candidate.matchScore.breakdown.cultural}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {candidate.matchScore.breakdown.cultural}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Competency Stats */}
              {Object.keys(candidate.competencyStats || {}).length > 0 && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <Star className="w-5 h-5 text-indigo-600" />
                    Attribute Scores
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(candidate.competencyStats).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                value >= 75 ? 'bg-green-500' :
                                value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-10 text-right">{value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Required Experiences */}
              {totalExperiences > 0 && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Experience Badges
                    <span className="text-sm font-normal text-gray-500">
                      ({achievedExperiences.length}/{totalExperiences} achieved)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {candidate.requiredExperiences?.map((exp, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border',
                          exp.achieved ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'
                        )}
                      >
                        {exp.achieved ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'font-medium text-sm',
                            exp.achieved ? 'text-green-800' : 'text-gray-600'
                          )}>
                            {exp.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{exp.description}</p>
                        </div>
                        {exp.isRequired && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills/Toolbox */}
              {candidate.toolbox && candidate.toolbox.length > 0 && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    Skills & Tools
                    <span className="text-sm font-normal text-gray-500">
                      ({achievedTools.length}/{allTools.length} proficient)
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {candidate.toolbox.map((category, catIdx) => (
                      <div key={catIdx}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          {category.category}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {category.tools.map((tool, toolIdx) => (
                            <span
                              key={toolIdx}
                              className={cn(
                                'px-3 py-1 rounded-full text-sm border',
                                tool.achieved
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-gray-100 text-gray-600 border-gray-300'
                              )}
                            >
                              {tool.name}
                              {tool.proficiency > 0 && (
                                <span className="ml-1 text-xs opacity-70">({tool.proficiency}%)</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications */}
              {candidate.academicBackground?.certifications && candidate.academicBackground.certifications.length > 0 && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.academicBackground.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm border border-blue-300"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Overall Qualitative Assessment - Separate from Cultural Fit */}
              {candidate.culturalFitAssessment?.notes && (
                <section className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Overall Qualitative Assessment
                  </h3>
                  <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {candidate.culturalFitAssessment.notes}
                    </p>
                  </div>
                  {candidate.culturalFitAssessment.assessedAt && (
                    <p className="text-xs text-gray-500 mt-3">
                      Generated: {new Date(candidate.culturalFitAssessment.assessedAt).toLocaleDateString()}
                    </p>
                  )}
                </section>
              )}

              {/* Cultural Fit Assessment - Score Only */}
              {candidate.culturalFitAssessment && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Cultural Fit Score
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="font-medium">Overall Score</span>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-sm font-semibold',
                        getScoreColor(candidate.culturalFitAssessment.score)
                      )}>
                        {candidate.culturalFitAssessment.score}%
                      </span>
                    </div>
                    {candidate.culturalFitAssessment.assessedAt && (
                      <p className="text-sm text-gray-500">
                        Assessed: {new Date(candidate.culturalFitAssessment.assessedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Interview Comments */}
              {candidate.interviewComments && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    Interview Comments
                  </h3>
                  <div className="bg-white p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap">
                    {candidate.interviewComments}
                  </div>
                </section>
              )}

              {/* Motivations */}
              {candidate.motivations && candidate.motivations.length > 0 && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Motivations
                  </h3>
                  <ul className="space-y-2">
                    {candidate.motivations.map((motivation, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-600 mt-0.5">+</span>
                        <span>{motivation}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Pain Points / Areas for Development */}
              {candidate.painPoints && candidate.painPoints.length > 0 && (
                <section className="bg-gray-50 rounded-xl p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Areas for Development
                  </h3>
                  <ul className="space-y-2">
                    {candidate.painPoints.map((painPoint, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-amber-600 mt-0.5">!</span>
                        <span>{painPoint}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
