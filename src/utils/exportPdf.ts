/**
 * PDF Export Utility for Talent Acquisition RPG Dashboard
 * Generates a comprehensive report with success profile and candidate comparison
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SuccessProfile, CandidateProfile, MatchWeights } from '../types';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Color definitions (SATS brand colors)
const COLORS = {
  primary: [238, 37, 54] as [number, number, number],      // sats-red
  secondary: [48, 169, 206] as [number, number, number],   // sats-blue
  success: [34, 197, 94] as [number, number, number],      // green
  warning: [255, 166, 43] as [number, number, number],     // sats-orange
  purple: [80, 40, 79] as [number, number, number],        // sats-purple
  navy: [26, 26, 26] as [number, number, number],          // dark
  gray: [107, 114, 128] as [number, number, number],       // gray
  lightGray: [243, 244, 246] as [number, number, number],  // light gray
};

interface ExportOptions {
  profile: SuccessProfile;
  candidates: CandidateProfile[];
  weights: MatchWeights;
  selectedIndices?: number[];
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): [number, number, number] {
  if (score >= 90) return [234, 179, 8];    // gold/yellow
  if (score >= 75) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.primary;
}

/**
 * Get score label
 */
function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  return 'Needs Development';
}

/**
 * Sort candidates by overall score (descending)
 */
function sortCandidatesByScore(candidates: CandidateProfile[]): CandidateProfile[] {
  return [...candidates].sort((a, b) => b.matchScore.overall - a.matchScore.overall);
}

/**
 * Generate recommendation text based on candidate scores
 */
function generateRecommendation(
  candidates: CandidateProfile[],
  weights: MatchWeights
): { recommended: CandidateProfile | null; reasoning: string[] } {
  if (candidates.length === 0) {
    return { recommended: null, reasoning: ['No candidates to evaluate.'] };
  }

  const sorted = sortCandidatesByScore(candidates);
  const top = sorted[0];
  const reasoning: string[] = [];

  // Overall recommendation
  reasoning.push(
    `${top.personalInfo.name} has the highest overall match score of ${top.matchScore.overall}%.`
  );

  // Breakdown analysis
  const breakdown = top.matchScore.breakdown;

  if (breakdown.competencies >= 90) {
    reasoning.push(`Excellent attribute alignment (${breakdown.competencies}%) with the success profile.`);
  } else if (breakdown.competencies >= 75) {
    reasoning.push(`Strong attribute match (${breakdown.competencies}%) indicating good fit for role requirements.`);
  }

  if (breakdown.experiences === 100) {
    reasoning.push(`Has achieved all required experience badges.`);
  } else if (breakdown.experiences >= 75) {
    reasoning.push(`Meets most required experience criteria (${breakdown.experiences}%).`);
  }

  if (breakdown.tools >= 90) {
    reasoning.push(`Proficient in nearly all required skills and tools (${breakdown.tools}%).`);
  } else if (breakdown.tools >= 75) {
    reasoning.push(`Good skill proficiency (${breakdown.tools}%) across required tools.`);
  }

  if (top.culturalFitAssessment) {
    if (breakdown.cultural >= 80) {
      reasoning.push(`Strong cultural fit (${breakdown.cultural}%) based on assessment.`);
    } else if (breakdown.cultural >= 60) {
      reasoning.push(`Moderate cultural alignment (${breakdown.cultural}%).`);
    }
  } else {
    reasoning.push(`Cultural fit assessment pending.`);
  }

  // Compare with runner-up if exists
  if (sorted.length > 1) {
    const runnerUp = sorted[1];
    const scoreDiff = top.matchScore.overall - runnerUp.matchScore.overall;
    if (scoreDiff <= 5) {
      reasoning.push(
        `Note: ${runnerUp.personalInfo.name} is a close second with ${runnerUp.matchScore.overall}% (${scoreDiff} point difference).`
      );
    }
  }

  // Weight context
  const highestWeight = Math.max(
    weights.attributes,
    weights.experiences,
    weights.skillProficiency,
    weights.culturalFit
  );

  if (weights.attributes === highestWeight) {
    reasoning.push(`This evaluation prioritizes attributes (${weights.attributes}% weight).`);
  } else if (weights.experiences === highestWeight) {
    reasoning.push(`This evaluation prioritizes experience (${weights.experiences}% weight).`);
  } else if (weights.skillProficiency === highestWeight) {
    reasoning.push(`This evaluation prioritizes skill proficiency (${weights.skillProficiency}% weight).`);
  } else if (weights.culturalFit === highestWeight) {
    reasoning.push(`This evaluation prioritizes cultural fit (${weights.culturalFit}% weight).`);
  }

  return { recommended: top, reasoning };
}

/**
 * Export results to PDF
 */
export function exportResultsToPdf(options: ExportOptions): void {
  const { profile, candidates, weights, selectedIndices } = options;

  // Filter to selected candidates if specified
  const candidatesToExport = selectedIndices && selectedIndices.length > 0
    ? selectedIndices.map(i => candidates[i]).filter(Boolean)
    : candidates;

  if (candidatesToExport.length === 0) {
    alert('No candidates to export. Please ensure candidates are loaded.');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // ==========================================
  // HEADER
  // ==========================================
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Talent Acquisition Report', 14, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profile.role.title}`, 14, 28);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, pageWidth - 14, 28, { align: 'right' });

  yPos = 45;

  // ==========================================
  // SUCCESS PROFILE SUMMARY
  // ==========================================
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Success Profile Summary', 14, yPos);
  yPos += 8;

  doc.setDrawColor(...COLORS.secondary);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 8;

  // Role details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('Role:', 14, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(profile.role.title, 35, yPos);
  yPos += 6;

  if (profile.role.level) {
    doc.setFont('helvetica', 'bold');
    doc.text('Level:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.role.level, 35, yPos);
    yPos += 6;
  }

  if (profile.role.class) {
    doc.setFont('helvetica', 'bold');
    doc.text('Objective:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    const objectiveLines = doc.splitTextToSize(profile.role.class, pageWidth - 50);
    doc.text(objectiveLines, 45, yPos);
    yPos += objectiveLines.length * 5 + 4;
  }

  // Required Attributes
  if (profile.attributeConfig && profile.attributeConfig.length > 0) {
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text('Key Attributes:', 14, yPos);
    yPos += 6;

    const attrData = profile.attributeConfig.map(attr => [
      attr.label,
      `${attr.value}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Attribute', 'Target']],
      body: attrData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30, halign: 'center' } },
      margin: { left: 14, right: pageWidth / 2 + 10 },
      tableWidth: 'wrap',
    });

    yPos = doc.lastAutoTable.finalY + 8;
  }

  // Weight Configuration
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.purple);
  doc.text('Evaluation Weights:', 14, yPos);
  yPos += 6;

  const weightData = [
    ['Attributes', `${weights.attributes}%`],
    ['Experience', `${weights.experiences}%`],
    ['Skill Proficiency', `${weights.skillProficiency}%`],
    ['Cultural Fit', `${weights.culturalFit}%`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: weightData,
    theme: 'plain',
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14 },
    tableWidth: 'wrap',
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  // ==========================================
  // CANDIDATE COMPARISON
  // ==========================================
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Comparison', 14, yPos);
  yPos += 8;

  doc.setDrawColor(...COLORS.warning);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 8;

  // Sort candidates by score
  const sortedCandidates = sortCandidatesByScore(candidatesToExport);

  // Comparison table
  const comparisonData = sortedCandidates.map((candidate, index) => [
    `${index + 1}`,
    candidate.personalInfo.name,
    candidate.personalInfo.currentRole,
    `${candidate.personalInfo.yearsExperience} yrs`,
    `${candidate.matchScore.breakdown.competencies}%`,
    `${candidate.matchScore.breakdown.experiences}%`,
    `${candidate.matchScore.breakdown.tools}%`,
    candidate.culturalFitAssessment ? `${candidate.matchScore.breakdown.cultural}%` : 'Pending',
    `${candidate.matchScore.overall}%`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Rank', 'Name', 'Current Role', 'Exp', 'Attr', 'Exp', 'Skills', 'Culture', 'Overall']],
    body: comparisonData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.warning, fontSize: 8, textColor: [0, 0, 0] },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Highlight the overall score column with colors
      if (data.section === 'body' && data.column.index === 8) {
        const score = parseInt(data.cell.text[0]);
        if (score >= 90) {
          data.cell.styles.textColor = [234, 179, 8];
          data.cell.styles.fontStyle = 'bold';
        } else if (score >= 75) {
          data.cell.styles.textColor = COLORS.success;
          data.cell.styles.fontStyle = 'bold';
        } else if (score >= 60) {
          data.cell.styles.textColor = COLORS.warning;
        }
      }
      // Highlight rank 1
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fillColor = [254, 249, 195]; // light yellow
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  // ==========================================
  // DETAILED CANDIDATE PROFILES
  // ==========================================
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Candidate Profiles', 14, yPos);
  yPos += 8;

  doc.setDrawColor(...COLORS.success);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  sortedCandidates.forEach((candidate, index) => {
    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    const scoreColor = getScoreColor(candidate.matchScore.overall);
    const rankBadgeColor: [number, number, number] = index === 0 ? [234, 179, 8] : COLORS.gray;

    // Candidate header with rank badge
    doc.setFillColor(...rankBadgeColor);
    doc.roundedRect(14, yPos - 4, 20, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`#${index + 1}`, 24, yPos + 3, { align: 'center' });

    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(12);
    doc.text(candidate.personalInfo.name, 40, yPos + 2);

    doc.setTextColor(...scoreColor);
    doc.setFontSize(14);
    doc.text(`${candidate.matchScore.overall}%`, pageWidth - 14, yPos + 2, { align: 'right' });

    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(9);
    doc.text(getScoreLabel(candidate.matchScore.overall), pageWidth - 14, yPos + 8, { align: 'right' });

    yPos += 12;

    // Candidate details
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${candidate.personalInfo.currentRole} | ${candidate.personalInfo.yearsExperience} years experience`, 40, yPos);
    yPos += 8;

    // Score breakdown mini-table
    const breakdownData = [
      ['Attributes', `${candidate.matchScore.breakdown.competencies}%`],
      ['Experience', `${candidate.matchScore.breakdown.experiences}%`],
      ['Skills', `${candidate.matchScore.breakdown.tools}%`],
      ['Cultural Fit', candidate.culturalFitAssessment ? `${candidate.matchScore.breakdown.cultural}%` : 'Pending'],
    ];

    autoTable(doc, {
      startY: yPos,
      body: breakdownData,
      theme: 'plain',
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 40 },
      tableWidth: 'wrap',
    });

    yPos = doc.lastAutoTable.finalY + 6;

    // Interview Comments (if any)
    if (candidate.interviewComments && candidate.interviewComments.trim()) {
      // Check if we need a new page for comments
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(240, 249, 255); // light blue background
      const commentLines = doc.splitTextToSize(candidate.interviewComments, pageWidth - 60);
      const commentBoxHeight = Math.max(commentLines.length * 4 + 12, 20);

      doc.roundedRect(40, yPos, pageWidth - 54, commentBoxHeight, 2, 2, 'F');
      doc.setDrawColor(147, 197, 253); // blue border
      doc.setLineWidth(0.3);
      doc.roundedRect(40, yPos, pageWidth - 54, commentBoxHeight, 2, 2, 'S');

      yPos += 6;
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Interview Comments:', 44, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.navy);
      doc.setFontSize(8);
      doc.text(commentLines, 44, yPos);
      yPos += commentLines.length * 4 + 5;
    }

    yPos += 4;
  });

  // ==========================================
  // RECOMMENDATION
  // ==========================================
  // New page for recommendation
  doc.addPage();
  yPos = 20;

  doc.setFillColor(...COLORS.success);
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECOMMENDATION', pageWidth / 2, 8, { align: 'center' });

  yPos = 25;

  const { recommended, reasoning } = generateRecommendation(sortedCandidates, weights);

  if (recommended) {
    // Recommended candidate highlight box
    doc.setFillColor(240, 253, 244); // light green
    doc.roundedRect(14, yPos, pageWidth - 28, 40, 3, 3, 'F');
    doc.setDrawColor(...COLORS.success);
    doc.setLineWidth(1);
    doc.roundedRect(14, yPos, pageWidth - 28, 40, 3, 3, 'S');

    yPos += 10;
    doc.setTextColor(...COLORS.success);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Candidate:', 20, yPos);

    yPos += 8;
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(18);
    doc.text(recommended.personalInfo.name, 20, yPos);

    doc.setFontSize(24);
    doc.setTextColor(...getScoreColor(recommended.matchScore.overall));
    doc.text(`${recommended.matchScore.overall}%`, pageWidth - 20, yPos, { align: 'right' });

    yPos += 10;
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${recommended.personalInfo.currentRole} | ${recommended.personalInfo.yearsExperience} years experience`,
      20,
      yPos
    );

    yPos += 25;

    // Reasoning
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Observations:', 14, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);

    reasoning.forEach((reason) => {
      const lines = doc.splitTextToSize(`• ${reason}`, pageWidth - 35);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 5 + 3;
    });

    yPos += 10;

    // Score comparison chart (as table)
    if (sortedCandidates.length > 1) {
      doc.setTextColor(...COLORS.navy);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Score Comparison:', 14, yPos);
      yPos += 8;

      const chartData = sortedCandidates.slice(0, 5).map((c) => [
        c.personalInfo.name,
        `${c.matchScore.breakdown.competencies}`,
        `${c.matchScore.breakdown.experiences}`,
        `${c.matchScore.breakdown.tools}`,
        c.culturalFitAssessment ? `${c.matchScore.breakdown.cultural}` : '-',
        `${c.matchScore.overall}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Candidate', 'Attr', 'Exp', 'Skills', 'Culture', 'Overall']],
        body: chartData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.navy, fontSize: 9 },
        bodyStyles: { fontSize: 9, halign: 'center' },
        columnStyles: {
          0: { halign: 'left', cellWidth: 50 },
        },
        margin: { left: 14, right: 14 },
      });
    }
  }

  // ==========================================
  // FOOTER
  // ==========================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Talent Acquisition RPG Dashboard',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `talent-report-${profile.role.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
