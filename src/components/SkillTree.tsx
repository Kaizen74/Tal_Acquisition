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
  Lock,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { ToolCategory, Tool } from '../types';

interface SkillTreeProps {
  toolbox: ToolCategory[];
  candidateToolbox?: ToolCategory[];
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
};

function getSkillLevel(proficiency: number): 'mastered' | 'proficient' | 'locked' {
  if (proficiency >= 85) return 'mastered';
  if (proficiency >= 50) return 'proficient';
  return 'locked';
}

export function SkillTree({ toolbox, candidateToolbox }: SkillTreeProps) {
  const [selectedTool, setSelectedTool] = useState<{
    tool: Tool;
    candidateTool?: Tool;
    category: string;
  } | null>(null);

  return (
    <div className="relative">
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
                    const displayProficiency = candidateTool?.proficiency ?? tool.proficiency;
                    const level = getSkillLevel(displayProficiency);
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
                          'relative flex flex-col items-center p-3 rounded-lg transition-all duration-200 hover:scale-105',
                          level === 'mastered' &&
                            'bg-yellow-50 border-2 border-yellow-400 shadow-md shadow-yellow-200',
                          level === 'proficient' &&
                            'bg-gray-50 border-2 border-gray-300',
                          level === 'locked' &&
                            'bg-gray-100 border-2 border-gray-200 grayscale'
                        )}
                      >
                        {/* Tool icon */}
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                            level === 'mastered' && 'bg-yellow-400 text-white',
                            level === 'proficient' && 'bg-gray-400 text-white',
                            level === 'locked' && 'bg-gray-300 text-gray-500'
                          )}
                        >
                          {level === 'locked' ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <ToolIcon className="w-5 h-5" />
                          )}
                        </div>

                        {/* Tool name */}
                        <span className="text-xs font-medium text-gray-700 text-center max-w-20">
                          {tool.name}
                        </span>

                        {/* Proficiency indicator */}
                        <div className="mt-2 w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              level === 'mastered' && 'bg-yellow-400',
                              level === 'proficient' && 'bg-sats-blue',
                              level === 'locked' && 'bg-gray-300'
                            )}
                            style={{ width: `${displayProficiency}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                          {displayProficiency}%
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
                <span className="text-sm text-gray-600">Status</span>
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

              {/* Profile requirement */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Required Proficiency</span>
                  <span className="font-medium text-sats-blue">
                    {selectedTool.tool.proficiency}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sats-blue rounded-full"
                    style={{ width: `${selectedTool.tool.proficiency}%` }}
                  />
                </div>
              </div>

              {/* Candidate proficiency */}
              {selectedTool.candidateTool && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Candidate Proficiency</span>
                    <span className="font-medium text-sats-orange">
                      {selectedTool.candidateTool.proficiency}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sats-orange rounded-full"
                      style={{
                        width: `${selectedTool.candidateTool.proficiency}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Comparison */}
              {selectedTool.candidateTool && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Gap Analysis</span>
                    {selectedTool.candidateTool.proficiency >=
                    selectedTool.tool.proficiency ? (
                      <span className="text-sm font-medium text-sats-green">
                        + Meets Requirement
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-sats-red">
                        -{' '}
                        {selectedTool.tool.proficiency -
                          selectedTool.candidateTool.proficiency}
                        % below
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
