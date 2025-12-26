import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Radar as ChartRadarIcon,
  Award,
  TreeDeciduous,
  Users,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { RadarChart } from './RadarChart';
import { ExperienceBadges } from './ExperienceBadges';
import { SkillTree } from './SkillTree';
import { MatchScore } from './MatchScore';
import { CandidateCard } from './CandidateCard';
import { FileUpload } from './FileUpload';
import { exampleProfile } from '../data/successProfile';
import { candidateProfiles as initialCandidates } from '../data/candidateProfiles';
import { calculateMatchScore } from '../utils/calculateMatch';
import type { SuccessProfile, CandidateProfile } from '../types';
import { cn } from '../utils/cn';

export function Dashboard() {
  const [profile, setProfile] = useState<SuccessProfile>(exampleProfile);
  const [candidates, setCandidates] = useState<CandidateProfile[]>(initialCandidates);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(
    new Set([0])
  );
  const [showUpload, setShowUpload] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Calculate match scores for all candidates
  useEffect(() => {
    const updatedCandidates = candidates.map((candidate) => ({
      ...candidate,
      matchScore: calculateMatchScore(profile, candidate),
    }));
    setCandidates(updatedCandidates);
  }, [profile]);

  // Get selected candidate for overlay
  const selectedCandidate = useMemo(() => {
    const indices = Array.from(selectedCandidates);
    if (indices.length === 1) {
      return candidates[indices[0]];
    }
    return null;
  }, [selectedCandidates, candidates]);

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
          </div>
        </div>
      </header>

      {/* Upload section */}
      {showUpload && (
        <div className="bg-white border-b border-gray-200 py-6 px-4">
          <div className="max-w-7xl mx-auto">
            <FileUpload
              onProfileLoaded={handleProfileLoaded}
              currentProfile={profile}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Role Profile Header */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar
              name={profile.role.title}
              roleClass={profile.role.class}
              size="lg"
              motivations={profile.motivations}
              painPoints={profile.painPoints}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-sats-purple/10 text-sats-purple text-xs font-medium rounded">
                  {profile.role.class}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-500">{profile.role.level}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {profile.role.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.academicBackground.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="px-2 py-1 bg-sats-blue/10 text-sats-blue text-xs font-medium rounded"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
            {selectedCandidate && (
              <div className="md:ml-auto">
                <MatchScore score={selectedCandidate.matchScore} size="md" />
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
                  Competency Stats
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
                candidateStats={selectedCandidate?.competencyStats}
                candidateName={selectedCandidate?.personalInfo.name}
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
                candidateExperiences={selectedCandidate?.requiredExperiences}
              />
            </div>
          </section>
        </div>

        {/* Skill Tree */}
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
                Skill Tree Inventory
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
              candidateToolbox={selectedCandidate?.toolbox}
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
                onToggleSelect={() => toggleCandidate(index)}
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
    </div>
  );
}
