import { useState } from 'react';
import {
  MessageSquare,
  BarChart3,
  Database,
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

// Determine skill status based on achieved field
function getSkillStatus(_tool: Tool, candidateTool?: Tool): 'achieved' | 'missing' {
  if (!candidateTool) {
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

      {/* Compact grid layout for all categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toolbox.map((category, catIndex) => {
          const CategoryIcon = categoryIcons[category.category] || Database;
          const candidateCategory = candidateToolbox?.[catIndex];

          return (
            <div
              key={category.category}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              {/* Compact category header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-sats-purple text-white flex items-center justify-center">
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {category.category}
                </h4>
              </div>

              {/* Compact tools list */}
              <div className="flex flex-wrap gap-2">
                {category.tools.map((tool, toolIndex) => {
                  const candidateTool = candidateCategory?.tools[toolIndex];
                  const status = getSkillStatus(tool, candidateTool);

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
                        'relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105',
                        status === 'achieved'
                          ? 'bg-sats-green/15 text-sats-green border border-sats-green/30'
                          : 'bg-gray-200 text-gray-500 border border-gray-300'
                      )}
                    >
                      {/* Status icon only - no duplicate tool icon */}
                      {status === 'achieved' ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{tool.name}</span>

                      {/* Required badge */}
                      {tool.isRequired && (
                        <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-sats-red text-white text-[10px] leading-none rounded-full">
                          Req
                        </span>
                      )}
                    </button>
                  );
                })}
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
