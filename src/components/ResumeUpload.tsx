import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  User,
  Trash2,
  Sparkles,
  Download,
  Table,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { parseMultipleResumes } from '../utils/parseResume';
import { parseMultipleResumesWithSemanticMatching } from '../utils/claudeResumeParser';
import { parseCandidatesCSVWithSemanticMatching, downloadCandidatesCSVTemplate } from '../utils/claudeCandidatesCSVParser';
import { ApiKeyConfig } from './ApiKeyConfig';
import type { CandidateProfile, SuccessProfile } from '../types';

interface ResumeUploadProps {
  successProfile: SuccessProfile;
  onCandidatesLoaded: (candidates: CandidateProfile[]) => void;
  existingCandidates: CandidateProfile[];
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
  candidate?: CandidateProfile;
  candidateCount?: number; // For CSV files with multiple candidates
}

type UploadMode = 'pdf' | 'csv';

export function ResumeUpload({
  successProfile,
  onCandidatesLoaded,
  existingCandidates,
}: ResumeUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('pdf');
  const [processingProgress, setProcessingProgress] = useState<{ processed: number; total: number; status: string } | null>(null);

  const handleApiKeyChange = useCallback((apiKey: string | null) => {
    setClaudeApiKey(apiKey);
  }, []);

  const processPDFFiles = useCallback(async (files: File[]) => {
    const profileContext = {
      role: successProfile.role,
      requiredExperiences: successProfile.requiredExperiences,
      toolbox: successProfile.toolbox,
      attributeConfig: successProfile.attributeConfig,
      motivations: successProfile.motivations,
      painPoints: successProfile.painPoints,
      academicBackground: successProfile.academicBackground,
      rawProfileText: successProfile.rawProfileText,
    };

    // Use semantic matching when API key is available for deep language analysis
    const results = claudeApiKey
      ? await parseMultipleResumesWithSemanticMatching(files, claudeApiKey, profileContext)
      : await parseMultipleResumes(files, profileContext);

    return results;
  }, [successProfile, claudeApiKey]);

  const processCSVFile = useCallback(async (file: File) => {
    if (!claudeApiKey) {
      return {
        candidates: [],
        errors: ['Claude API key is required for CSV candidate parsing. Please configure your API key.'],
      };
    }

    const profileContext = {
      role: successProfile.role,
      requiredExperiences: successProfile.requiredExperiences,
      toolbox: successProfile.toolbox,
      attributeConfig: successProfile.attributeConfig,
      motivations: successProfile.motivations,
      painPoints: successProfile.painPoints,
      academicBackground: successProfile.academicBackground,
      rawProfileText: successProfile.rawProfileText,
    };

    // Progress callback for large datasets
    const onProgress = (processed: number, total: number, status: string) => {
      setProcessingProgress({ processed, total, status });
    };

    // Use semantic matching for deep language analysis (distinguishes functional role vs industry)
    const result = await parseCandidatesCSVWithSemanticMatching(file, claudeApiKey, profileContext, onProgress);
    setProcessingProgress(null);
    return result;
  }, [successProfile, claudeApiKey]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Determine if this is a CSV upload
      const isCSVUpload = acceptedFiles.length === 1 && acceptedFiles[0].name.toLowerCase().endsWith('.csv');

      if (isCSVUpload) {
        // CSV upload - single file with multiple candidates
        const file = acceptedFiles[0];
        const newFile: UploadedFile = {
          file,
          status: 'pending',
        };

        setUploadedFiles((prev) => [...prev, newFile]);
        setIsProcessing(true);

        const results = await processCSVFile(file);

        // Update file status
        setUploadedFiles((prev) => {
          const updated = [...prev];
          const fileIndex = updated.findIndex((f) => f.file === file);
          if (fileIndex !== -1) {
            if (results.errors.length > 0 && results.candidates.length === 0) {
              updated[fileIndex] = {
                ...updated[fileIndex],
                status: 'error',
                error: results.errors.join(', '),
              };
            } else {
              updated[fileIndex] = {
                ...updated[fileIndex],
                status: 'success',
                candidateCount: results.candidates.length,
              };
            }
          }
          return updated;
        });

        // Add successful candidates
        if (results.candidates.length > 0) {
          onCandidatesLoaded([...existingCandidates, ...results.candidates]);
        }

        setIsProcessing(false);
      } else {
        // PDF upload - multiple individual resumes
        const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
          file,
          status: 'pending' as const,
        }));

        setUploadedFiles((prev) => [...prev, ...newFiles]);
        setIsProcessing(true);

        const results = await processPDFFiles(acceptedFiles);

        // Update file statuses and candidates
        setUploadedFiles((prev) => {
          const updated = [...prev];
          let candidateIndex = 0;

          for (let i = 0; i < updated.length; i++) {
            const file = updated[i];
            if (file.status === 'pending') {
              const matchingError = results.errors.find((err) =>
                err.includes(file.file.name)
              );

              if (matchingError) {
                updated[i] = {
                  ...file,
                  status: 'error',
                  error: matchingError,
                };
              } else if (candidateIndex < results.candidates.length) {
                updated[i] = {
                  ...file,
                  status: 'success',
                  candidate: results.candidates[candidateIndex],
                };
                candidateIndex++;
              }
            }
          }

          return updated;
        });

        // Add successful candidates to the list
        if (results.candidates.length > 0) {
          onCandidatesLoaded([...existingCandidates, ...results.candidates]);
        }

        setIsProcessing(false);
      }
    },
    [successProfile, onCandidatesLoaded, existingCandidates, processPDFFiles, processCSVFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadMode === 'csv'
      ? { 'text/csv': ['.csv'] }
      : { 'application/pdf': ['.pdf'] },
    multiple: uploadMode === 'pdf',
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const removed = prev[index];
      const updated = prev.filter((_, i) => i !== index);

      // Also remove from candidates if it was successfully parsed
      if (removed.candidate) {
        const updatedCandidates = existingCandidates.filter(
          (c) => c.personalInfo.name !== removed.candidate?.personalInfo.name
        );
        onCandidatesLoaded(updatedCandidates);
      }

      return updated;
    });
  };

  const clearAll = () => {
    // Remove all uploaded candidates (keep the original 3)
    const originalCandidates = existingCandidates.slice(0, 3);
    onCandidatesLoaded(originalCandidates);
    setUploadedFiles([]);
  };

  const successCount = uploadedFiles.filter((f) => f.status === 'success').length;
  const errorCount = uploadedFiles.filter((f) => f.status === 'error').length;
  const totalCandidatesFromCSV = uploadedFiles
    .filter((f) => f.status === 'success' && f.candidateCount)
    .reduce((sum, f) => sum + (f.candidateCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Upload Candidate Data
          </h3>
          <p className="text-sm text-gray-500">
            Upload PDF resumes or a CSV file with multiple candidates
          </p>
        </div>
        {uploadedFiles.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Claude API Configuration */}
      <ApiKeyConfig onApiKeyChange={handleApiKeyChange} />

      {/* Upload Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setUploadMode('pdf')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            uploadMode === 'pdf'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <FileText className="w-4 h-4" />
          PDF Resumes
        </button>
        <button
          onClick={() => setUploadMode('csv')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            uploadMode === 'csv'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Table className="w-4 h-4" />
          CSV Bulk Upload
        </button>
      </div>

      {/* CSV Template Download */}
      {uploadMode === 'csv' && (
        <button
          onClick={downloadCandidatesCSVTemplate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Candidates CSV Template
        </button>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-sats-purple bg-sats-purple/5'
            : 'border-gray-300 hover:border-gray-400',
          isProcessing && 'pointer-events-none opacity-75'
        )}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-sats-purple animate-spin" />
            <p className="text-gray-600">
              {claudeApiKey ? 'Processing with Claude AI...' : 'Processing files...'}
            </p>
            {processingProgress && (
              <div className="mt-4 w-full max-w-xs mx-auto">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{processingProgress.status}</span>
                  <span>{processingProgress.processed}/{processingProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sats-purple to-sats-blue transition-all duration-300"
                    style={{ width: `${(processingProgress.processed / processingProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {processingProgress.total >= 50
                    ? 'Using parallel processing with Haiku model for speed...'
                    : 'Processing with Sonnet model...'}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {claudeApiKey ? (
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-sats-purple to-sats-blue flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            ) : (
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            )}
            <p className="text-gray-600 mb-2">
              {isDragActive
                ? `Drop the ${uploadMode === 'csv' ? 'CSV file' : 'PDF files'} here...`
                : uploadMode === 'csv'
                  ? 'Drag & drop a CSV file with multiple candidates'
                  : 'Drag & drop PDF resumes here'}
            </p>
            <p className="text-sm text-gray-400">
              {uploadMode === 'csv'
                ? 'Single CSV file with one candidate per row'
                : 'or click to select files (multiple PDFs supported)'}
            </p>
            {claudeApiKey && (
              <p className="text-xs text-sats-purple mt-2 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                Claude AI enhanced parsing enabled
              </p>
            )}
            {!claudeApiKey && uploadMode === 'csv' && (
              <p className="text-xs text-amber-600 mt-2">
                Claude API key required for CSV parsing
              </p>
            )}
          </>
        )}
      </div>

      {/* Status summary */}
      {uploadedFiles.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
          </span>
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-sats-green">
              <CheckCircle className="w-4 h-4" />
              {totalCandidatesFromCSV > 0
                ? `${totalCandidatesFromCSV} candidates from CSV`
                : `${successCount} parsed`}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-sats-red">
              <AlertCircle className="w-4 h-4" />
              {errorCount} failed
            </span>
          )}
        </div>
      )}

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={`${uploadedFile.file.name}-${index}`}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                uploadedFile.status === 'success' &&
                  'bg-sats-green/5 border-sats-green/30',
                uploadedFile.status === 'error' &&
                  'bg-red-50 border-red-200',
                uploadedFile.status === 'pending' &&
                  'bg-gray-50 border-gray-200',
                uploadedFile.status === 'parsing' &&
                  'bg-sats-purple/5 border-sats-purple/30'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  uploadedFile.status === 'success' && 'bg-sats-green text-white',
                  uploadedFile.status === 'error' && 'bg-red-500 text-white',
                  uploadedFile.status === 'pending' && 'bg-gray-300 text-white',
                  uploadedFile.status === 'parsing' && 'bg-sats-purple text-white'
                )}
              >
                {uploadedFile.status === 'success' && <User className="w-5 h-5" />}
                {uploadedFile.status === 'error' && <X className="w-5 h-5" />}
                {uploadedFile.status === 'pending' && <FileText className="w-5 h-5" />}
                {uploadedFile.status === 'parsing' && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {uploadedFile.candidate?.personalInfo.name || uploadedFile.file.name}
                </p>
                {uploadedFile.status === 'success' && uploadedFile.candidate && (
                  <p className="text-sm text-gray-500">
                    {uploadedFile.candidate.personalInfo.currentRole} •{' '}
                    {uploadedFile.candidate.personalInfo.yearsExperience} years exp
                  </p>
                )}
                {uploadedFile.status === 'success' && uploadedFile.candidateCount && (
                  <p className="text-sm text-sats-green">
                    {uploadedFile.candidateCount} candidates extracted from CSV
                  </p>
                )}
                {uploadedFile.status === 'error' && (
                  <p className="text-sm text-red-600">{uploadedFile.error}</p>
                )}
                {uploadedFile.status === 'pending' && (
                  <p className="text-sm text-gray-500">Waiting to process...</p>
                )}
                {uploadedFile.status === 'parsing' && (
                  <p className="text-sm text-sats-purple">Extracting data...</p>
                )}
              </div>

              {/* File size */}
              <span className="text-xs text-gray-400">
                {(uploadedFile.file.size / 1024).toFixed(0)} KB
              </span>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">
          {uploadMode === 'csv' ? 'CSV Upload Tips:' : 'PDF Upload Tips:'}
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {uploadMode === 'csv' ? (
            <>
              <li>• Download the template to see the expected column format</li>
              <li>• Supports any HR CSV format - columns are auto-detected</li>
              <li>• Optimized for up to 800 candidates with parallel processing</li>
              <li>• Large datasets (50+) use faster Haiku model for speed</li>
              <li>• Claude AI will extract and match attributes, experiences, and skills</li>
            </>
          ) : (
            <>
              <li>• Upload text-based PDFs (not scanned images)</li>
              <li>• Standard resume formats work best</li>
              <li>• Include skills, experience, and education sections</li>
              <li>• Multiple files can be uploaded at once</li>
            </>
          )}
          {claudeApiKey && (
            <li className="text-sats-purple font-medium">
              • Claude AI will extract attributes, experiences, and skill proficiencies with higher accuracy
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
