import { cn } from '../utils/cn';
import { Shield, Sword, Wand2, Heart } from 'lucide-react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  roleClass?: string;
  size?: 'sm' | 'md' | 'lg';
  motivations?: string[];
  painPoints?: string[];
}

const classIcons: Record<string, React.ReactNode> = {
  'Support Paladin': <Shield className="w-4 h-4" />,
  'Sales Wizard': <Wand2 className="w-4 h-4" />,
  'Tech Warrior': <Sword className="w-4 h-4" />,
  default: <Heart className="w-4 h-4" />,
};

const classColors: Record<string, string> = {
  'Support Paladin': 'bg-sats-blue border-sats-blue',
  'Sales Wizard': 'bg-sats-purple border-sats-purple',
  'Tech Warrior': 'bg-sats-red border-sats-red',
  default: 'bg-sats-teal border-sats-teal',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-sats-red',
    'bg-sats-purple',
    'bg-sats-blue',
    'bg-sats-green',
    'bg-sats-teal',
    'bg-sats-orange',
    'bg-sats-navy',
  ];
  const index =
    name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
}

export function Avatar({
  name,
  avatarUrl,
  roleClass = 'default',
  size = 'md',
  motivations,
  painPoints,
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl',
  };

  const borderSizeClasses = {
    sm: 'ring-2 ring-offset-1',
    md: 'ring-4 ring-offset-2',
    lg: 'ring-4 ring-offset-2',
  };

  const classColor = classColors[roleClass] || classColors.default;
  const classIcon = classIcons[roleClass] || classIcons.default;

  return (
    <div className="relative group">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold text-white',
          sizeClasses[size],
          borderSizeClasses[size],
          'ring-offset-white',
          classColor.split(' ')[1], // border color
          avatarUrl ? '' : getAvatarColor(name)
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials(name)
        )}
      </div>

      {/* Role class badge */}
      {roleClass !== 'default' && (
        <div
          className={cn(
            'absolute -bottom-1 -right-1 rounded-full p-1.5 text-white',
            classColor.split(' ')[0]
          )}
        >
          {classIcon}
        </div>
      )}

      {/* Tooltip with motivations and pain points */}
      {(motivations || painPoints) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          {motivations && motivations.length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs font-semibold text-sats-green mb-1">
                Motivations
              </h4>
              <ul className="text-xs text-gray-600 space-y-0.5">
                {motivations.slice(0, 3).map((m, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-sats-green">+</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {painPoints && painPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-sats-red mb-1">
                Pain Points
              </h4>
              <ul className="text-xs text-gray-600 space-y-0.5">
                {painPoints.slice(0, 3).map((p, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-sats-red">-</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
        </div>
      )}
    </div>
  );
}
