# Talent Acquisition RPG Dashboard

A gamified talent assessment platform that visualizes job role requirements as RPG character profiles and compares candidates against "Success Profiles" using fantasy game metaphors.

## Features

- **RPG-Style Character Sheets**: View job requirements as character classes with competency stats
- **Radar Chart Visualization**: Compare candidate competencies against success profile requirements
- **Experience Badges**: Track achievements with visual badge system
- **Skill Tree Inventory**: Interactive skill tree showing tool proficiencies
- **Candidate Comparison**: Side-by-side comparison of multiple candidates
- **CSV Import**: Upload custom success profiles and candidate data
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (data visualization)
- Papaparse (CSV parsing)
- React-dropzone (file upload)
- Lucide-react (icons)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Avatar.tsx          # Role/candidate avatar with class badges
│   ├── RadarChart.tsx      # Competency stats visualization
│   ├── ExperienceBadges.tsx # Achievement badges grid
│   ├── SkillTree.tsx       # Interactive skill tree
│   ├── MatchScore.tsx      # Circular match score display
│   ├── CandidateCard.tsx   # Candidate comparison cards
│   ├── FileUpload.tsx      # CSV file upload component
│   └── Dashboard.tsx       # Main dashboard layout
├── data/
│   ├── successProfile.ts   # Example success profile data
│   └── candidateProfiles.ts # Example candidate profiles
├── utils/
│   ├── calculateMatch.ts   # Match score calculation logic
│   ├── parseProfile.ts     # CSV parsing utilities
│   └── cn.ts               # Tailwind class merge utility
├── types/
│   └── index.ts            # TypeScript interfaces
├── App.tsx
└── main.tsx
```

## Usage

1. **View Default Profile**: The dashboard loads with an example "Customer & Technical Support Team Lead" success profile
2. **Compare Candidates**: Click the eye icon on candidate cards to toggle overlay comparison
3. **Upload Custom Profiles**: Click "Upload Profile" to import your own CSV data
4. **Download Template**: Use the template download button to get the correct CSV format

## CSV Format

The application accepts CSV files with the following sections:
- `role` - Role title, level, and class
- `competency` - Stats for problem solving, leadership, etc.
- `experience` - Required experiences with achievement status
- `tool` - Tool proficiencies by category
- `academic` - Education requirements
- `motivation` - Team motivations
- `painpoint` - Pain points
- `week` - Week-in-life descriptions

See `public/templates/success-profile-template.csv` for a complete example.

## Color Palette (SATS Brand)

- Primary Red: `#EE2536`
- Purple: `#50284F`
- Blue: `#30A9CE`
- Green: `#418E3D`
- Teal: `#4FC6B7`
- Orange: `#FFA62B`
- Yellow: `#FFDD15`
- Navy: `#1F5575`
- Gray: `#D5D7D7`

## License

MIT
