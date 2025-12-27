import type { SuccessProfile } from '../types';

export const exampleProfile: SuccessProfile = {
  role: {
    title: 'Customer & Technical Support Team Lead',
    level: 'JG2-JG3 equivalent',
    class: 'Support Paladin',
  },
  competencyStats: {
    problemSolving: 85,
    stakeholderManagement: 90,
    technicalExpertise: 75,
    leadership: 80,
    customerFocus: 95,
    adaptability: 85,
  },
  attributeConfig: [
    { key: 'problemSolving', label: 'Problem Solving', value: 85 },
    { key: 'stakeholderManagement', label: 'Stakeholder Mgmt', value: 90 },
    { key: 'technicalExpertise', label: 'Technical', value: 75 },
    { key: 'leadership', label: 'Leadership', value: 80 },
    { key: 'customerFocus', label: 'Customer Focus', value: 95 },
    { key: 'adaptability', label: 'Adaptability', value: 85 },
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
    preferredFields: ['Business Administration', 'Communications', 'Computer Science'],
    certifications: ['ITIL', 'Customer Service Excellence'],
  },
  toolbox: [
    {
      category: 'Communication',
      tools: [
        { name: 'Email Support', proficiency: 95, isRequired: true },
        { name: 'Phone Support', proficiency: 90, isRequired: true },
        { name: 'Chat Support', proficiency: 85, isRequired: false },
      ],
    },
    {
      category: 'Analytics',
      tools: [
        { name: 'KPI Dashboard', proficiency: 80, isRequired: true },
        { name: 'Customer Satisfaction Surveys', proficiency: 75, isRequired: true },
      ],
    },
    {
      category: 'Technical',
      tools: [
        { name: 'CRM System', proficiency: 85, isRequired: true },
        { name: 'Ticketing System', proficiency: 90, isRequired: true },
        { name: 'Knowledge Base Management', proficiency: 70, isRequired: false },
      ],
    },
  ],
  motivations: [
    'Career advancement',
    'Creating something new from the ground up',
    'Solving complex problems',
    'Building team morale',
  ],
  painPoints: [
    'Limited control over recruitment',
    'Slow decision-making processes',
    'Need for more advancement opportunities',
  ],
  weekInLife: [
    'Monday: Team all-hands, review weekend inquiries, allocate resources',
    'Tuesday-Thursday: Client operations, team coaching, stakeholder meetings',
    'Friday: Week review, prioritization planning, continuous improvement',
  ],
};
