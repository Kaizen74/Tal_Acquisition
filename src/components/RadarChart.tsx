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
import type { CompetencyStats } from '../types';

interface RadarChartProps {
  profileStats: CompetencyStats;
  candidateStats?: CompetencyStats;
  candidateName?: string;
}

// Labels displayed as "Attributes" instead of "Competencies"
const statLabels: Record<keyof CompetencyStats, string> = {
  problemSolving: 'Problem Solving',
  stakeholderManagement: 'Stakeholder Mgmt',
  technicalExpertise: 'Technical',
  leadership: 'Leadership',
  customerFocus: 'Customer Focus',
  adaptability: 'Adaptability',
};

export function RadarChart({
  profileStats,
  candidateStats,
  candidateName = 'Candidate',
}: RadarChartProps) {
  const data = (Object.keys(profileStats) as Array<keyof CompetencyStats>).map(
    (key) => ({
      subject: statLabels[key],
      profile: profileStats[key],
      candidate: candidateStats ? candidateStats[key] : undefined,
      fullMark: 100,
    })
  );

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

          {/* Success Profile */}
          <Radar
            name="Success Profile"
            dataKey="profile"
            stroke="#30A9CE"
            fill="#30A9CE"
            fillOpacity={0.4}
            strokeWidth={2}
          />

          {/* Candidate overlay */}
          {candidateStats && (
            <Radar
              name={candidateName}
              dataKey="candidate"
              stroke="#FFA62B"
              fill="#FFA62B"
              fillOpacity={0.2}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                  <p className="font-semibold text-gray-900 mb-1">
                    {data.subject}
                  </p>
                  <p className="text-sm text-sats-blue">
                    Profile: {data.profile}
                  </p>
                  {data.candidate !== undefined && (
                    <p className="text-sm text-sats-orange">
                      {candidateName}: {data.candidate}
                    </p>
                  )}
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
