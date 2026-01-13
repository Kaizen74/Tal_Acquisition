import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Radar as ChartRadarIcon,
  Award,
  TreeDeciduous,
  Users,
  Upload,
  ChevronDown,
  FileText,
  UserPlus,
  Target,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  FilePlus,
  Info,
  Settings,
  Download,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { RadarChart } from './RadarChart';
import { ExperienceBadges } from './ExperienceBadges';
import { SkillTree } from './SkillTree';
import { MatchScore } from './MatchScore';
import { CandidateCard } from './CandidateCard';
import { FileUpload } from './FileUpload';
import { ResumeUpload } from './ResumeUpload';
import { WeightConfig } from './WeightConfig';
import { AttributeScoreEditor } from './AttributeScoreEditor';
import { CulturalFitAssessment } from './CulturalFitAssessment';
import { CulturalFitConfig } from './CulturalFitConfig';
import { InterviewComments } from './InterviewComments';
import { exampleProfile } from '../data/successProfile';
import { candidateProfiles as initialCandidates } from '../data/candidateProfiles';
import { calculateMatchScore, DEFAULT_WEIGHTS } from '../utils/calculateMatch';
import { exportResultsToPdf } from '../utils/exportPdf';
import type { SuccessProfile, CandidateProfile, MatchWeights, CulturalFitAssessment as CulturalFitAssessmentType } from '../types';
import { cn } from '../utils/cn';

export function Dashboard() {
  const [profile, setProfile] = useState<SuccessProfile>(exampleProfile);
  const [candidates, setCandidates] = useState<CandidateProfile[]>(initialCandidates);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(
    new Set([0])
  );
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<'profile' | 'resumes'>('resumes');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [matchWeights, setMatchWeights] = useState<MatchWeights>(DEFAULT_WEIGHTS);
  const [editingCandidateIndex, setEditingCandidateIndex] = useState<number | null>(null);
  const [assessingCulturalFitIndex, setAssessingCulturalFitIndex] = useState<number | null>(null);
  const [showCulturalFitConfig, setShowCulturalFitConfig] = useState(false);
  const [editingCommentsIndex, setEditingCommentsIndex] = useState<number | null>(null);

  // Colors for candidates (matching RadarChart)
  const candidateColors = [
    '#FFA62B',  // Orange
    '#EE2536',  // Red
    '#50284F',  // Purple
    '#22C55E',  // Green
    '#3B82F6',  // Blue
  ];

  // Calculate match scores for all candidates when profile or weights change
  useEffect(() => {
    const updatedCandidates = candidates.map((candidate) => ({
      ...candidate,
      matchScore: calculateMatchScore(profile, candidate, matchWeights),
    }));
    setCandidates(updatedCandidates);
  }, [profile, matchWeights]);

  // Get all selected candidates for radar chart overlay
  const selectedCandidatesData = useMemo(() => {
    const indices = Array.from(selectedCandidates).sort((a, b) => a - b);
    return indices.map((index, i) => ({
      name: candidates[index]?.personalInfo.name || 'Unknown',
      stats: candidates[index]?.competencyStats,
      color: candidateColors[i % candidateColors.length],
      index,
    })).filter(c => c.stats);
  }, [selectedCandidates, candidates]);

  // Get first selected candidate for other displays
  const primarySelectedCandidate = useMemo(() => {
    const indices = Array.from(selectedCandidates);
    if (indices.length >= 1) {
      return candidates[indices[0]];
    }
    return null;
  }, [selectedCandidates, candidates]);

  // Get color for a specific candidate index
  const getCandidateColor = (candidateIndex: number): string | undefined => {
    const selectedIndices = Array.from(selectedCandidates).sort((a, b) => a - b);
    const positionInSelection = selectedIndices.indexOf(candidateIndex);
    if (positionInSelection === -1) return undefined;
    return candidateColors[positionInSelection % candidateColors.length];
  };

  const toggleCandidate = (index: number) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleProfileLoaded = (newProfile: SuccessProfile) => {
    setProfile(newProfile);
    setShowUpload(false);
  };

  const handleCandidatesLoaded = (newCandidates: CandidateProfile[]) => {
    // Recalculate match scores for new candidates
    const updatedCandidates = newCandidates.map((candidate) => ({
      ...candidate,
      matchScore: calculateMatchScore(profile, candidate, matchWeights),
    }));
    setCandidates(updatedCandidates);
  };

  const handleWeightsChange = (newWeights: MatchWeights) => {
    setMatchWeights(newWeights);
  };

  // Handle updated candidate scores from AttributeScoreEditor
  const handleCandidateScoreUpdate = (updatedCandidate: CandidateProfile) => {
    if (editingCandidateIndex === null) return;

    // Recalculate match score with updated stats
    const candidateWithScore = {
      ...updatedCandidate,
      matchScore: calculateMatchScore(profile, updatedCandidate, matchWeights),
    };

    setCandidates((prev) => {
      const updated = [...prev];
      updated[editingCandidateIndex] = candidateWithScore;
      return updated;
    });
  };

  // Handle cultural fit assessment save
  const handleCulturalFitSave = (assessment: CulturalFitAssessmentType) => {
    if (assessingCulturalFitIndex === null) return;

    const candidate = candidates[assessingCulturalFitIndex];
    const updatedCandidate = {
      ...candidate,
      culturalFitAssessment: assessment,
    };

    // Recalculate match score with the new cultural fit assessment
    const candidateWithScore = {
      ...updatedCandidate,
      matchScore: calculateMatchScore(profile, updatedCandidate, matchWeights),
    };

    setCandidates((prev) => {
      const updated = [...prev];
      updated[assessingCulturalFitIndex] = candidateWithScore;
      return updated;
    });
  };

  // Handle cultural fit config save (motivations and pain points)
  const handleCulturalFitConfigSave = (motivations: string[], painPoints: string[]) => {
    setProfile((prev) => ({
      ...prev,
      motivations,
      painPoints,
    }));
  };

  // Handle interview comments save
  const handleCommentsSave = (comments: string) => {
    if (editingCommentsIndex === null) return;
    setCandidates((prev) => {
      const updated = [...prev];
      updated[editingCommentsIndex] = {
        ...updated[editingCommentsIndex],
        interviewComments: comments,
      };
      return updated;
    });
  };

  // Reset to empty state for new project
  const handleNewProject = () => {
    const emptyProfile: SuccessProfile = {
      role: { title: '', level: '', class: '', description: '' },
      competencyStats: {},
      attributeConfig: [],
      requiredExperiences: [],
      academicBackground: { minDegree: '', preferredFields: [], certifications: [] },
      toolbox: [],
      motivations: [],
      painPoints: [],
      weekInLife: [],
    };
    setProfile(emptyProfile);
    setCandidates([]);
    setSelectedCandidates(new Set());
    setMatchWeights(DEFAULT_WEIGHTS);
    setShowUpload(true);
    setUploadTab('profile');
  };

  // Export results to PDF
  const handleExportPdf = () => {
    if (candidates.length === 0) {
      alert('No candidates to export. Please upload candidate resumes first.');
      return;
    }
    exportResultsToPdf({
      profile,
      candidates,
      weights: matchWeights,
      selectedIndices: Array.from(selectedCandidates),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-sats-red text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Talent Acquisition RPG
                </h1>
                <p className="text-white/80 text-sm">
                  Success Profile Character Sheet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewProject}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Start a new project with empty data"
              >
                <FilePlus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
              </button>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  showUpload
                    ? 'bg-white text-sats-red'
                    : 'bg-white/20 hover:bg-white/30'
                )}
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Profile</span>
              </button>
              <button
                onClick={handleExportPdf}
                disabled={candidates.length === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  candidates.length > 0
                    ? 'bg-sats-green hover:bg-sats-green/90 text-white'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                )}
                title="Export results to PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Upload section */}
      {showUpload && (
        <div className="bg-white border-b border-gray-200 py-6 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Upload tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setUploadTab('resumes')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  uploadTab === 'resumes'
                    ? 'border-sats-purple text-sats-purple'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <UserPlus className="w-4 h-4" />
                Upload Resumes (PDF)
              </button>
              <button
                onClick={() => setUploadTab('profile')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                  uploadTab === 'profile'
                    ? 'border-sats-blue text-sats-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <FileText className="w-4 h-4" />
                Upload Success Profile (CSV)
              </button>
            </div>

            {/* Tab content */}
            {uploadTab === 'profile' ? (
              <FileUpload
                onProfileLoaded={handleProfileLoaded}
                currentProfile={profile}
              />
            ) : (
              <ResumeUpload
                successProfile={profile}
                onCandidatesLoaded={handleCandidatesLoaded}
                existingCandidates={candidates}
              />
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Role Profile Header */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          {/* Top row: Avatar, Title/Info, and Match Score */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Avatar and main info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar
                name={profile.role.title}
                roleClass={profile.role.class}
                size="lg"
                motivations={profile.motivations}
                painPoints={profile.painPoints}
              />
              <div className="flex-1 min-w-0">
                {/* Seniority (formerly Level) */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Seniority:</span>
                  <span className="text-sm font-medium text-gray-700">{profile.role.level}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  {profile.role.title}
                </h2>

                {/* Minimum Degree */}
                {profile.academicBackground.minDegree && (
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-sats-navy" />
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">Min. Education:</span> {profile.academicBackground.minDegree}
                    </span>
                  </div>
                )}

                {/* Certifications */}
                {profile.academicBackground.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.academicBackground.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="px-2 py-1 bg-sats-blue/10 text-sats-blue text-xs font-medium rounded"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Match Score (when candidate selected) */}
            {primarySelectedCandidate && (
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                <MatchScore score={primarySelectedCandidate.matchScore} size="md" />
                <WeightConfig
                  weights={matchWeights}
                  onWeightsChange={handleWeightsChange}
                  className="w-64"
                />
              </div>
            )}
          </div>

          {/* Role Description - full width below header */}
          {profile.role.description && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  {profile.role.description}
                </p>
              </div>
            </div>
          )}

          {/* Objective - full width section */}
          {profile.role.class && (
            <div className="mt-4">
              <div className="bg-sats-purple/5 border border-sats-purple/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-sats-purple" />
                  <span className="text-xs font-semibold text-sats-purple uppercase tracking-wide">
                    Objective
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {profile.role.class}
                </p>
              </div>
            </div>
          )}

          {/* Motivations and Pain Points */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            {/* Section Header with Configure Button */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-700">Cultural Fit Criteria</h4>
              <button
                onClick={() => setShowCulturalFitConfig(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Configure cultural fit criteria"
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </button>
            </div>

            {/* Show message if no criteria defined */}
            {profile.motivations.length === 0 && profile.painPoints.length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-sm text-gray-500 mb-2">No cultural fit criteria defined</p>
                <button
                  onClick={() => setShowCulturalFitConfig(true)}
                  className="text-sm text-sats-blue hover:underline"
                >
                  Click to add motivations and pain points
                </button>
              </div>
            )}

            {/* Criteria Grid */}
            {(profile.motivations.length > 0 || profile.painPoints.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Motivations */}
                {profile.motivations.length > 0 && (
                  <div className="bg-sats-green/5 border border-sats-green/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-sats-green" />
                      <span className="text-sm font-semibold text-sats-green">Motivations</span>
                      <span className="text-xs text-gray-400">({profile.motivations.length})</span>
                    </div>
                    <ul className="space-y-1.5">
                      {profile.motivations.map((motivation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-sats-green mt-0.5">+</span>
                          <span>{motivation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pain Points */}
                {profile.painPoints.length > 0 && (
                  <div className="bg-sats-red/5 border border-sats-red/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-sats-red" />
                      <span className="text-sm font-semibold text-sats-red">Pain Points</span>
                      <span className="text-xs text-gray-400">({profile.painPoints.length})</span>
                    </div>
                    <ul className="space-y-1.5">
                      {profile.painPoints.map((painPoint, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-sats-red mt-0.5">!</span>
                          <span>{painPoint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Stats and Badges Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Radar Chart */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() =>
                setActiveSection(activeSection === 'radar' ? null : 'radar')
              }
              className="flex items-center justify-between w-full mb-4"
            >
              <div className="flex items-center gap-2">
                <ChartRadarIcon className="w-5 h-5 text-sats-blue" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Attribute Stats
                </h3>
              </div>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400 transition-transform lg:hidden',
                  activeSection === 'radar' && 'rotate-180'
                )}
              />
            </button>
            <div
              className={cn(
                'lg:block',
                activeSection === 'radar' || !activeSection
                  ? 'block'
                  : 'hidden lg:block'
              )}
            >
              <RadarChart
                profileStats={profile.competencyStats}
                attributeConfig={profile.attributeConfig}
                candidates={selectedCandidatesData}
              />
            </div>
          </section>

          {/* Experience Badges */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() =>
                setActiveSection(activeSection === 'badges' ? null : 'badges')
              }
              className="flex items-center justify-between w-full mb-4"
            >
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-sats-purple" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Experience Badges
                </h3>
              </div>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400 transition-transform lg:hidden',
                  activeSection === 'badges' && 'rotate-180'
                )}
              />
            </button>
            <div
              className={cn(
                'lg:block',
                activeSection === 'badges' || !activeSection
                  ? 'block'
                  : 'hidden lg:block'
              )}
            >
              <ExperienceBadges
                experiences={profile.requiredExperiences}
                candidateExperiences={primarySelectedCandidate?.requiredExperiences}
                candidateName={primarySelectedCandidate?.personalInfo.name}
                candidateColor={getCandidateColor(Array.from(selectedCandidates)[0])}
              />
            </div>
          </section>
        </div>

        {/* Skill Proficiency (Tools) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <button
            onClick={() =>
              setActiveSection(activeSection === 'skills' ? null : 'skills')
            }
            className="flex items-center justify-between w-full mb-6"
          >
            <div className="flex items-center gap-2">
              <TreeDeciduous className="w-5 h-5 text-sats-green" />
              <h3 className="text-lg font-semibold text-gray-900">
                Skill Proficiency (Tools)
              </h3>
            </div>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-gray-400 transition-transform lg:hidden',
                activeSection === 'skills' && 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'lg:block',
              activeSection === 'skills' || !activeSection
                ? 'block'
                : 'hidden lg:block'
            )}
          >
            <SkillTree
              toolbox={profile.toolbox}
              candidateToolbox={primarySelectedCandidate?.toolbox}
              candidateName={primarySelectedCandidate?.personalInfo.name}
              candidateColor={getCandidateColor(Array.from(selectedCandidates)[0])}
            />
          </div>
        </section>

        {/* Candidate Comparison */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-sats-orange" />
            <h3 className="text-lg font-semibold text-gray-900">
              Candidate Comparison
            </h3>
            <span className="ml-auto text-sm text-gray-500">
              {selectedCandidates.size} selected
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate, index) => (
              <CandidateCard
                key={candidate.personalInfo.name}
                candidate={candidate}
                successProfile={profile}
                isSelected={selectedCandidates.has(index)}
                selectionColor={getCandidateColor(index)}
                onToggleSelect={() => toggleCandidate(index)}
                onEditScores={() => setEditingCandidateIndex(index)}
                onAssessCulturalFit={() => setAssessingCulturalFitIndex(index)}
                onEditComments={() => setEditingCommentsIndex(index)}
              />
            ))}
          </div>
        </section>

        {/* Week in Life */}
        <section className="mt-8 bg-gradient-to-r from-sats-navy to-sats-purple text-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">A Week in the Life</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.weekInLife.map((day, index) => (
              <div
                key={index}
                className="bg-white/10 rounded-lg p-4 backdrop-blur-sm"
              >
                <p className="text-sm text-white/90">{day}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 px-4 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            Talent Acquisition RPG Dashboard - Visualizing Success Profiles
          </p>
        </div>
      </footer>

      {/* Attribute Score Editor Modal */}
      {editingCandidateIndex !== null && candidates[editingCandidateIndex] && (
        <AttributeScoreEditor
          candidate={candidates[editingCandidateIndex]}
          profileAttributeConfig={profile.attributeConfig || []}
          onSave={handleCandidateScoreUpdate}
          onClose={() => setEditingCandidateIndex(null)}
        />
      )}

      {/* Cultural Fit Assessment Modal */}
      {assessingCulturalFitIndex !== null && candidates[assessingCulturalFitIndex] && (
        <CulturalFitAssessment
          candidate={candidates[assessingCulturalFitIndex]}
          motivations={profile.motivations}
          painPoints={profile.painPoints}
          onSave={handleCulturalFitSave}
          onClose={() => setAssessingCulturalFitIndex(null)}
        />
      )}

      {/* Cultural Fit Config Modal */}
      {showCulturalFitConfig && (
        <CulturalFitConfig
          motivations={profile.motivations}
          painPoints={profile.painPoints}
          onSave={handleCulturalFitConfigSave}
          onClose={() => setShowCulturalFitConfig(false)}
        />
      )}

      {/* Interview Comments Modal */}
      {editingCommentsIndex !== null && candidates[editingCommentsIndex] && (
        <InterviewComments
          candidate={candidates[editingCommentsIndex]}
          onSave={handleCommentsSave}
          onClose={() => setEditingCommentsIndex(null)}
        />
      )}
    </div>
  );
}
