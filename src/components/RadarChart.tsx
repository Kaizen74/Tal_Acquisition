import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CompetencyStats, AttributeConfig } from '../types';

interface CandidateData {
  name: string;
  stats: CompetencyStats;
  color: string;
}

interface RadarChartProps {
  profileStats: CompetencyStats;
  attributeConfig?: AttributeConfig[]; // Dynamic attribute labels
  candidates?: CandidateData[];
}

// Colors for different candidates
const candidateColors = [
  { stroke: '#FFA62B', fill: '#FFA62B' },  // Orange
  { stroke: '#EE2536', fill: '#EE2536' },  // Red
  { stroke: '#50284F', fill: '#50284F' },  // Purple
  { stroke: '#22C55E', fill: '#22C55E' },  // Green
  { stroke: '#3B82F6', fill: '#3B82F6' },  // Blue
];

// Helper to get label for a key
function getAttributeLabel(key: string, attributeConfig?: AttributeConfig[]): string {
  if (attributeConfig) {
    const config = attributeConfig.find((c) => c.key === key);
    if (config) return config.label;
  }
  // Fallback: convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function RadarChart({
  profileStats,
  attributeConfig,
  candidates = [],
}: RadarChartProps) {
  // Build data structure with profile and all candidates
  // Use attributeConfig order if available, otherwise use profileStats keys
  const attributeKeys = attributeConfig
    ? attributeConfig.map((c) => c.key)
    : Object.keys(profileStats);

  const data = attributeKeys.map((key) => {
    const point: Record<string, string | number> = {
      subject: getAttributeLabel(key, attributeConfig),
      profile: profileStats[key] || 0,
      fullMark: 100,
    };

    // Add each candidate's stats
    candidates.forEach((candidate, index) => {
      point[`candidate${index}`] = candidate.stats?.[key] || 0;
    });

    return point;
  });

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#D5D7D7" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#4B5563', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickCount={5}
          />

          {/* Success Profile - always shown */}
          <Radar
            name="Success Profile"
            dataKey="profile"
            stroke="#30A9CE"
            fill="#30A9CE"
            fillOpacity={0.3}
            strokeWidth={2}
          />

          {/* Candidate overlays */}
          {candidates.map((candidate, index) => {
            const colors = candidateColors[index % candidateColors.length];
            return (
              <Radar
                key={candidate.name}
                name={candidate.name}
                dataKey={`candidate${index}`}
                stroke={candidate.color || colors.stroke}
                fill={candidate.color || colors.fill}
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray={index === 0 ? undefined : `${5 + index * 2} ${3 + index}`}
              />
            );
          })}

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const dataPoint = payload[0].payload;
              return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                  <p className="font-semibold text-gray-900 mb-2">
                    {dataPoint.subject}
                  </p>
                  <p className="text-sm text-sats-blue mb-1">
                    Success Profile: {dataPoint.profile}
                  </p>
                  {candidates.map((candidate, index) => {
                    const colors = candidateColors[index % candidateColors.length];
                    return (
                      <p
                        key={candidate.name}
                        className="text-sm"
                        style={{ color: candidate.color || colors.stroke }}
                      >
                        {candidate.name}: {dataPoint[`candidate${index}`]}
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
