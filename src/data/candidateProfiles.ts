import type { CandidateProfile } from '../types';

export const candidateProfiles: CandidateProfile[] = [
  {
    personalInfo: {
      name: 'Sarah Chen',
      yearsExperience: 7,
      currentRole: 'Senior Support Specialist',
    },
    role: {
      title: 'Customer & Technical Support Team Lead',
      level: 'JG2-JG3 equivalent',
      class: 'Support Paladin',
    },
    competencyStats: {
      problemSolving: 88,
      stakeholderManagement: 82,
      technicalExpertise: 78,
      leadership: 75,
      customerFocus: 92,
      adaptability: 88,
    },
    attributeConfig: [
      { key: 'problemSolving', label: 'Problem Solving', value: 88 },
      { key: 'stakeholderManagement', label: 'Stakeholder Mgmt', value: 82 },
      { key: 'technicalExpertise', label: 'Technical', value: 78 },
      { key: 'leadership', label: 'Leadership', value: 75 },
      { key: 'customerFocus', label: 'Customer Focus', value: 92 },
      { key: 'adaptability', label: 'Adaptability', value: 88 },
    ],
    requiredExperiences: [
      {
        category: 'Leadership',
        name: 'Team Management',
        description: 'Led cross-functional support team',
        minYears: 3,
        achieved: true,
        badgeIcon: 'Users',
      },
      {
        category: 'Technical',
        name: 'Customer Support Systems',
        description: 'Experience with CRM and ticketing systems',
        minYears: 5,
        achieved: true,
        badgeIcon: 'Headphones',
      },
      {
        category: 'Operations',
        name: 'Process Improvement',
        description: 'Implemented operational efficiency initiatives',
        minYears: 2,
        achieved: true,
        badgeIcon: 'TrendingUp',
      },
      {
        category: 'Leadership',
        name: 'Change Management',
        description: 'Guided teams through organizational transformation',
        minYears: 2,
        achieved: false,
        badgeIcon: 'RefreshCw',
      },
      {
        category: 'Technical',
        name: 'Multilingual Support',
        description: 'Provided support in multiple languages',
        minYears: 3,
        achieved: true,
        badgeIcon: 'Languages',
      },
      {
        category: 'Analytics',
        name: 'Data-Driven Decision Making',
        description: 'Used analytics to drive support improvements',
        minYears: 2,
        achieved: true,
        badgeIcon: 'BarChart3',
      },
    ],
    academicBackground: {
      minDegree: "Bachelor's Degree",
      preferredFields: ['Communications', 'Business Administration'],
      certifications: ['ITIL', 'Six Sigma Green Belt'],
    },
    toolbox: [
      {
        category: 'Communication',
        tools: [
          { name: 'Email Support', proficiency: 95, isRequired: true, achieved: true },
          { name: 'Phone Support', proficiency: 88, isRequired: true, achieved: true },
          { name: 'Chat Support', proficiency: 90, isRequired: false, achieved: true },
        ],
      },
      {
        category: 'Analytics',
        tools: [
          { name: 'KPI Dashboard', proficiency: 75, isRequired: true, achieved: true },
          { name: 'Customer Satisfaction Surveys', proficiency: 80, isRequired: true, achieved: false },
        ],
      },
      {
        category: 'Technical',
        tools: [
          { name: 'CRM System', proficiency: 90, isRequired: true, achieved: true },
          { name: 'Ticketing System', proficiency: 92, isRequired: true, achieved: true },
          { name: 'Knowledge Base Management', proficiency: 85, isRequired: false, achieved: true },
        ],
      },
    ],
    motivations: [
      'Career advancement',
      'Solving complex problems',
      'Building team morale',
      'Work-life balance',
    ],
    painPoints: [
      'Limited resources for training',
      'Need for more advancement opportunities',
    ],
    weekInLife: [
      'Monday: Team check-ins, priority review',
      'Tuesday-Thursday: Client escalations, training sessions',
      'Friday: Documentation, planning',
    ],
    matchScore: {
      overall: 0,
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  },
  {
    personalInfo: {
      name: 'Marcus Johnson',
      yearsExperience: 5,
      currentRole: 'Technical Support Lead',
    },
    role: {
      title: 'Customer & Technical Support Team Lead',
      level: 'JG2-JG3 equivalent',
      class: 'Support Paladin',
    },
    competencyStats: {
      problemSolving: 90,
      stakeholderManagement: 75,
      technicalExpertise: 88,
      leadership: 70,
      customerFocus: 85,
      adaptability: 80,
    },
    attributeConfig: [
      { key: 'problemSolving', label: 'Problem Solving', value: 90 },
      { key: 'stakeholderManagement', label: 'Stakeholder Mgmt', value: 75 },
      { key: 'technicalExpertise', label: 'Technical', value: 88 },
      { key: 'leadership', label: 'Leadership', value: 70 },
      { key: 'customerFocus', label: 'Customer Focus', value: 85 },
      { key: 'adaptability', label: 'Adaptability', value: 80 },
    ],
    requiredExperiences: [
      {
        category: 'Leadership',
        name: 'Team Management',
        description: 'Led cross-functional support team',
        minYears: 3,
        achieved: true,
        badgeIcon: 'Users',
      },
      {
        category: 'Technical',
        name: 'Customer Support Systems',
        description: 'Experience with CRM and ticketing systems',
        minYears: 5,
        achieved: true,
        badgeIcon: 'Headphones',
      },
      {
        category: 'Operations',
        name: 'Process Improvement',
        description: 'Implemented operational efficiency initiatives',
        minYears: 2,
        achieved: false,
        badgeIcon: 'TrendingUp',
      },
      {
        category: 'Leadership',
        name: 'Change Management',
        description: 'Guided teams through organizational transformation',
        minYears: 2,
        achieved: false,
        badgeIcon: 'RefreshCw',
      },
      {
        category: 'Technical',
        name: 'Multilingual Support',
        description: 'Provided support in multiple languages',
        minYears: 3,
        achieved: false,
        badgeIcon: 'Languages',
      },
      {
        category: 'Analytics',
        name: 'Data-Driven Decision Making',
        description: 'Used analytics to drive support improvements',
        minYears: 2,
        achieved: true,
        badgeIcon: 'BarChart3',
      },
    ],
    academicBackground: {
      minDegree: "Bachelor's Degree",
      preferredFields: ['Computer Science', 'Information Technology'],
      certifications: ['AWS Certified', 'ITIL'],
    },
    toolbox: [
      {
        category: 'Communication',
        tools: [
          { name: 'Email Support', proficiency: 85, isRequired: true, achieved: true },
          { name: 'Phone Support', proficiency: 80, isRequired: true, achieved: false },
          { name: 'Chat Support', proficiency: 95, isRequired: false, achieved: true },
        ],
      },
      {
        category: 'Analytics',
        tools: [
          { name: 'KPI Dashboard', proficiency: 85, isRequired: true, achieved: true },
          { name: 'Customer Satisfaction Surveys', proficiency: 70, isRequired: true, achieved: true },
        ],
      },
      {
        category: 'Technical',
        tools: [
          { name: 'CRM System', proficiency: 88, isRequired: true, achieved: true },
          { name: 'Ticketing System', proficiency: 95, isRequired: true, achieved: true },
          { name: 'Knowledge Base Management', proficiency: 90, isRequired: false, achieved: true },
        ],
      },
    ],
    motivations: [
      'Technical challenges',
      'Solving complex problems',
      'Learning new technologies',
    ],
    painPoints: [
      'Too many administrative tasks',
      'Slow decision-making processes',
    ],
    weekInLife: [
      'Monday: System health checks, ticket triage',
      'Tuesday-Thursday: Technical escalations, knowledge base updates',
      'Friday: Automation projects, documentation',
    ],
    matchScore: {
      overall: 0,
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  },
  {
    personalInfo: {
      name: 'Elena Rodriguez',
      yearsExperience: 9,
      currentRole: 'Customer Success Manager',
    },
    role: {
      title: 'Customer & Technical Support Team Lead',
      level: 'JG2-JG3 equivalent',
      class: 'Support Paladin',
    },
    competencyStats: {
      problemSolving: 82,
      stakeholderManagement: 95,
      technicalExpertise: 70,
      leadership: 88,
      customerFocus: 98,
      adaptability: 90,
    },
    attributeConfig: [
      { key: 'problemSolving', label: 'Problem Solving', value: 82 },
      { key: 'stakeholderManagement', label: 'Stakeholder Mgmt', value: 95 },
      { key: 'technicalExpertise', label: 'Technical', value: 70 },
      { key: 'leadership', label: 'Leadership', value: 88 },
      { key: 'customerFocus', label: 'Customer Focus', value: 98 },
      { key: 'adaptability', label: 'Adaptability', value: 90 },
    ],
    requiredExperiences: [
      {
        category: 'Leadership',
        name: 'Team Management',
        description: 'Led cross-functional support team',
        minYears: 3,
        achieved: true,
        badgeIcon: 'Users',
      },
      {
        category: 'Technical',
        name: 'Customer Support Systems',
        description: 'Experience with CRM and ticketing systems',
        minYears: 5,
        achieved: true,
        badgeIcon: 'Headphones',
      },
      {
        category: 'Operations',
        name: 'Process Improvement',
        description: 'Implemented operational efficiency initiatives',
        minYears: 2,
        achieved: true,
        badgeIcon: 'TrendingUp',
      },
      {
        category: 'Leadership',
        name: 'Change Management',
        description: 'Guided teams through organizational transformation',
        minYears: 2,
        achieved: true,
        badgeIcon: 'RefreshCw',
      },
      {
        category: 'Technical',
        name: 'Multilingual Support',
        description: 'Provided support in multiple languages',
        minYears: 3,
        achieved: true,
        badgeIcon: 'Languages',
      },
      {
        category: 'Analytics',
        name: 'Data-Driven Decision Making',
        description: 'Used analytics to drive support improvements',
        minYears: 2,
        achieved: true,
        badgeIcon: 'BarChart3',
      },
    ],
    academicBackground: {
      minDegree: "Master's Degree",
      preferredFields: ['Business Administration', 'Psychology'],
      certifications: ['Customer Service Excellence', 'PMP'],
    },
    toolbox: [
      {
        category: 'Communication',
        tools: [
          { name: 'Email Support', proficiency: 98, isRequired: true, achieved: true },
          { name: 'Phone Support', proficiency: 95, isRequired: true, achieved: true },
          { name: 'Chat Support', proficiency: 80, isRequired: false, achieved: true },
        ],
      },
      {
        category: 'Analytics',
        tools: [
          { name: 'KPI Dashboard', proficiency: 90, isRequired: true, achieved: true },
          { name: 'Customer Satisfaction Surveys', proficiency: 95, isRequired: true, achieved: true },
        ],
      },
      {
        category: 'Technical',
        tools: [
          { name: 'CRM System', proficiency: 92, isRequired: true, achieved: true },
          { name: 'Ticketing System', proficiency: 85, isRequired: true, achieved: true },
          { name: 'Knowledge Base Management', proficiency: 78, isRequired: false, achieved: true },
        ],
      },
    ],
    motivations: [
      'Career advancement',
      'Creating something new from the ground up',
      'Building team morale',
      'Mentoring others',
    ],
    painPoints: [
      'Limited control over recruitment',
      'Need for better tools',
    ],
    weekInLife: [
      'Monday: Strategic planning, stakeholder alignment',
      'Tuesday-Thursday: Customer meetings, team development',
      'Friday: Performance reviews, initiative tracking',
    ],
    matchScore: {
      overall: 0,
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  },
];
