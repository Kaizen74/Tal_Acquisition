/**
 * CandidatesTable - Simplified table view for large candidate datasets (100+)
 * Features: sorting, pagination, quick filters, click-to-expand
 */

import { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { CandidateProfile } from '../types';

interface CandidatesTableProps {
  candidates: CandidateProfile[];
  onSelectCandidate: (candidate: CandidateProfile) => void;
  onViewDetails?: (candidate: CandidateProfile) => void;
  selectedCandidateId?: string;
}

type SortField = 'name' | 'role' | 'matchScore' | 'experience' | 'skillsMatch';
type SortDirection = 'asc' | 'desc';
type FilterRange = 'all' | 'high' | 'medium' | 'low';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function CandidatesTable({ candidates, onSelectCandidate, onViewDetails, selectedCandidateId }: CandidatesTableProps) {
  const [sortField, setSortField] = useState<SortField>('matchScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRange, setFilterRange] = useState<FilterRange>('all');

  // Calculate match scores and skills match for each candidate
  const candidatesWithScores = useMemo(() => {
    return candidates.map(candidate => {
      // Calculate overall match score from competency stats
      const competencyValues = Object.values(candidate.competencyStats || {});
      const avgCompetency = competencyValues.length > 0
        ? competencyValues.reduce((a, b) => a + b, 0) / competencyValues.length
        : 50;

      // Calculate skills match percentage
      const allTools = candidate.toolbox?.flatMap(cat => cat.tools) || [];
      const achievedTools = allTools.filter(t => t.achieved).length;
      const skillsMatch = allTools.length > 0 ? Math.round((achievedTools / allTools.length) * 100) : 0;

      // Calculate experiences match
      const achievedExp = candidate.requiredExperiences?.filter(e => e.achieved).length || 0;
      const totalExp = candidate.requiredExperiences?.length || 1;
      const expMatch = Math.round((achievedExp / totalExp) * 100);

      // Overall score combines competency, skills, and experiences
      const overallScore = Math.round((avgCompetency * 0.4) + (skillsMatch * 0.3) + (expMatch * 0.3));

      return {
        ...candidate,
        calculatedScore: overallScore,
        skillsMatchPercent: skillsMatch,
        expMatchPercent: expMatch,
      };
    });
  }, [candidates]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    let filtered = candidatesWithScores;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.personalInfo.name.toLowerCase().includes(term) ||
        c.personalInfo.currentRole.toLowerCase().includes(term)
      );
    }

    // Score range filter
    if (filterRange !== 'all') {
      filtered = filtered.filter(c => {
        const score = c.calculatedScore;
        switch (filterRange) {
          case 'high': return score >= 75;
          case 'medium': return score >= 50 && score < 75;
          case 'low': return score < 50;
          default: return true;
        }
      });
    }

    return filtered;
  }, [candidatesWithScores, searchTerm, filterRange]);

  // Sort candidates
  const sortedCandidates = useMemo(() => {
    const sorted = [...filteredCandidates].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortField) {
        case 'name':
          aVal = a.personalInfo.name.toLowerCase();
          bVal = b.personalInfo.name.toLowerCase();
          break;
        case 'role':
          aVal = a.personalInfo.currentRole.toLowerCase();
          bVal = b.personalInfo.currentRole.toLowerCase();
          break;
        case 'matchScore':
          aVal = a.calculatedScore;
          bVal = b.calculatedScore;
          break;
        case 'experience':
          aVal = a.personalInfo.yearsExperience;
          bVal = b.personalInfo.yearsExperience;
          break;
        case 'skillsMatch':
          aVal = a.skillsMatchPercent;
          bVal = b.skillsMatchPercent;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [filteredCandidates, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedCandidates.length / pageSize);
  const paginatedCandidates = sortedCandidates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="w-4" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  // Score badge color
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Score icon
  const ScoreIcon = ({ score }: { score: number }) => {
    if (score >= 75) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (score >= 50) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Candidate Overview</h2>
            <p className="text-indigo-100 text-sm">
              {candidates.length} total candidates • {filteredCandidates.length} showing
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="text-white/70">High Match:</span>
              <span className="text-white font-semibold ml-1">
                {candidatesWithScores.filter(c => c.calculatedScore >= 75).length}
              </span>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="text-white/70">Medium:</span>
              <span className="text-white font-semibold ml-1">
                {candidatesWithScores.filter(c => c.calculatedScore >= 50 && c.calculatedScore < 75).length}
              </span>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="text-white/70">Low:</span>
              <span className="text-white font-semibold ml-1">
                {candidatesWithScores.filter(c => c.calculatedScore < 50).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Score filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterRange}
            onChange={(e) => { setFilterRange(e.target.value as FilterRange); setCurrentPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Scores</option>
            <option value="high">High Match (75+)</option>
            <option value="medium">Medium (50-74)</option>
            <option value="low">Low (&lt;50)</option>
          </select>
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-indigo-600"
                >
                  Candidate <SortIndicator field="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('role')}
                  className="flex items-center gap-1 hover:text-indigo-600"
                >
                  Current Role <SortIndicator field="role" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('experience')}
                  className="flex items-center gap-1 hover:text-indigo-600 mx-auto"
                >
                  Exp <SortIndicator field="experience" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('matchScore')}
                  className="flex items-center gap-1 hover:text-indigo-600 mx-auto"
                >
                  Match Score <SortIndicator field="matchScore" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('skillsMatch')}
                  className="flex items-center gap-1 hover:text-indigo-600 mx-auto"
                >
                  Skills <SortIndicator field="skillsMatch" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedCandidates.map((candidate, idx) => {
              const isSelected = selectedCandidateId === candidate.personalInfo.name;
              return (
                <tr
                  key={`${candidate.personalInfo.name}-${idx}`}
                  className={`hover:bg-indigo-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-100' : ''}`}
                  onClick={() => onSelectCandidate(candidate)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {candidate.personalInfo.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{candidate.personalInfo.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {candidate.personalInfo.currentRole}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-600">{candidate.personalInfo.yearsExperience}y</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <ScoreIcon score={candidate.calculatedScore} />
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold border ${getScoreColor(candidate.calculatedScore)}`}>
                        {candidate.calculatedScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            candidate.skillsMatchPercent >= 75 ? 'bg-green-500' :
                            candidate.skillsMatchPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${candidate.skillsMatchPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{candidate.skillsMatchPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Always select the candidate for radar chart comparison
                        onSelectCandidate(candidate);
                        // Also open the detail modal if callback provided
                        if (onViewDetails) {
                          onViewDetails(candidate);
                        }
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                      title="View full profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedCandidates.length)} of {sortedCandidates.length} candidates
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
            <ChevronLeft className="w-4 h-4 -ml-2" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
            <ChevronRight className="w-4 h-4 -ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
