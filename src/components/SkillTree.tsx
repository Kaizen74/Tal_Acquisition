import { useState } from 'react';
import {
  MessageSquare,
  Phone,
  MessageCircle,
  BarChart3,
  ThumbsUp,
  Database,
  Ticket,
  BookOpen,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { ToolCategory, Tool } from '../types';

interface SkillTreeProps {
  toolbox: ToolCategory[];
  candidateToolbox?: ToolCategory[];
  candidateName?: string;
  candidateColor?: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  Communication: MessageSquare,
  Analytics: BarChart3,
  Technical: Database,
};

const toolIcons: Record<string, React.ElementType> = {
  'Email Support': MessageSquare,
  'Phone Support': Phone,
  'Chat Support': MessageCircle,
  'KPI Dashboard': BarChart3,
  'Customer Satisfaction Surveys': ThumbsUp,
  'CRM System': Database,
  'Ticketing System': Ticket,
  'Knowledge Base Management': BookOpen,
  'AI Coding': Database,
};

// Determine skill status based on achieved field
function getSkillStatus(_tool: Tool, candidateTool?: Tool): 'achieved' | 'missing' {
  if (!candidateTool) {
    // No candidate data - show as not achieved by default
    return 'missing';
  }
  return candidateTool.achieved ? 'achieved' : 'missing';
}

export function SkillTree({ toolbox, candidateToolbox, candidateName, candidateColor }: SkillTreeProps) {
  const [selectedTool, setSelectedTool] = useState<{
    tool: Tool;
    candidateTool?: Tool;
    category: string;
  } | null>(null);

  // Calculate summary stats
  const achievedCount = toolbox.reduce((count, category, catIndex) => {
    return count + category.tools.filter((_tool, toolIndex) => {
      const candidateTool = candidateToolbox?.[catIndex]?.tools[toolIndex];
      return candidateTool?.achieved;
    }).length;
  }, 0);
  const totalTools = toolbox.reduce((count, cat) => count + cat.tools.length, 0);

  return (
    <div className="relative">
      {/* Candidate indicator */}
      {candidateName && (
        <div
          className="flex items-center gap-2 mb-4 p-2 rounded-lg border-l-4"
          style={{
            borderColor: candidateColor || '#6B7280',
            backgroundColor: candidateColor ? `${candidateColor}10` : '#F3F4F6',
          }}
        >
          <Database className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Viewing: {candidateName}
          </span>
          <span className="ml-auto text-sm text-gray-500">
            {achievedCount}/{totalTools} achieved
          </span>
        </div>
      )}
      <div className="space-y-8">
        {toolbox.map((category, catIndex) => {
          const CategoryIcon = categoryIcons[category.category] || Database;
          const candidateCategory = candidateToolbox?.[catIndex];

          return (
            <div key={category.category} className="relative">
              {/* Category node */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-sats-purple text-white flex items-center justify-center shadow-lg">
                  <CategoryIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {category.category}
                </h3>
              </div>

              {/* Tools grid */}
              <div className="ml-6 pl-6 border-l-2 border-sats-gray">
                <div className="flex flex-wrap gap-4">
                  {category.tools.map((tool, toolIndex) => {
                    const candidateTool = candidateCategory?.tools[toolIndex];
                    const status = getSkillStatus(tool, candidateTool);
                    const ToolIcon = toolIcons[tool.name] || Database;

                    return (
                      <button
                        key={tool.name}
                        onClick={() =>
                          setSelectedTool({
                            tool,
                            candidateTool,
                            category: category.category,
                          })
                        }
                        className={cn(
                          'relative flex flex-col items-center p-3 rounded-lg transition-all duration-200 hover:scale-105 border-2',
                          status === 'achieved' &&
                            'bg-sats-green/10 border-sats-green',
                          status === 'missing' &&
                            'bg-gray-100 border-gray-300 grayscale'
                        )}
                      >
                        {/* Tool icon with status indicator */}
                        <div
                          className={cn(
                            'relative w-10 h-10 rounded-full flex items-center justify-center mb-2',
                            status === 'achieved' && 'bg-sats-green text-white',
                            status === 'missing' && 'bg-gray-400 text-white'
                          )}
                        >
                          <ToolIcon className="w-5 h-5" />

                          {/* Status overlay */}
                          <div
                            className={cn(
                              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                              status === 'achieved' && 'bg-white text-sats-green',
                              status === 'missing' && 'bg-white text-red-500'
                            )}
                          >
                            {status === 'achieved' && <CheckCircle className="w-4 h-4" />}
                            {status === 'missing' && <XCircle className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Tool name */}
                        <span className="text-xs font-medium text-gray-700 text-center max-w-20">
                          {tool.name}
                        </span>

                        {/* Required badge */}
                        {tool.isRequired && (
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-sats-red text-white text-xs rounded-full">
                            Req
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tool details modal */}
      {selectedTool && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedTool(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs text-sats-purple font-medium uppercase">
                  {selectedTool.category}
                </span>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedTool.tool.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Required status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Requirement</span>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-sm font-medium',
                    selectedTool.tool.isRequired
                      ? 'bg-sats-red/10 text-sats-red'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {selectedTool.tool.isRequired ? 'Required' : 'Optional'}
                </span>
              </div>

              {/* Candidate status */}
              {selectedTool.candidateTool && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Candidate Status</span>
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-sm font-medium flex items-center gap-1',
                      selectedTool.candidateTool.achieved
                        ? 'bg-sats-green/10 text-sats-green'
                        : 'bg-red-50 text-red-500'
                    )}
                  >
                    {selectedTool.candidateTool.achieved ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Has Skill
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" /> Missing
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Summary */}
              {selectedTool.candidateTool && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Assessment</span>
                    {selectedTool.candidateTool.achieved ? (
                      <span className="text-sm font-medium text-sats-green">
                        ✓ Meets Requirement
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-sats-red">
                        ✗ Skill Gap Identified
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
