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
} from 'lucide-react';
import { cn } from '../utils/cn';
import { parseMultipleResumes } from '../utils/parseResume';
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
}

export function ResumeUpload({
  successProfile,
  onCandidatesLoaded,
  existingCandidates,
}: ResumeUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Add files to the list with pending status
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        status: 'pending' as const,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      setIsProcessing(true);

      // Process each file
      const results = await parseMultipleResumes(acceptedFiles, {
        role: successProfile.role,
        requiredExperiences: successProfile.requiredExperiences,
        toolbox: successProfile.toolbox,
      });

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
    },
    [successProfile, onCandidatesLoaded, existingCandidates]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Upload Candidate Resumes
          </h3>
          <p className="text-sm text-gray-500">
            Upload PDF resumes to automatically extract candidate data
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
            <p className="text-gray-600">Processing resumes...</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              {isDragActive
                ? 'Drop the PDF files here...'
                : 'Drag & drop PDF resumes here'}
            </p>
            <p className="text-sm text-gray-400">
              or click to select files (multiple files supported)
            </p>
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
              {successCount} parsed
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
        <h4 className="font-medium text-blue-900 mb-2">Tips for best results:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Upload text-based PDFs (not scanned images)</li>
          <li>• Standard resume formats work best</li>
          <li>• Include skills, experience, and education sections</li>
          <li>• Multiple files can be uploaded at once</li>
        </ul>
      </div>
    </div>
  );
}
