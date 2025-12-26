import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { cn } from '../utils/cn';
import type { SuccessProfile } from '../types';
import { parseProfileCSV, validateProfileData } from '../utils/parseProfile';

interface FileUploadProps {
  onProfileLoaded: (profile: SuccessProfile) => void;
  currentProfile?: SuccessProfile;
}

type UploadStatus = 'idle' | 'parsing' | 'success' | 'error';

export function FileUpload({ onProfileLoaded, currentProfile }: FileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      setStatus('parsing');
      setErrors([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;

        try {
          const profile = parseProfileCSV(content);

          if (!profile) {
            setStatus('error');
            setErrors(['Failed to parse CSV file. Please check the format.']);
            return;
          }

          const validationErrors = validateProfileData(profile);
          if (validationErrors.length > 0) {
            setStatus('error');
            setErrors(validationErrors);
            return;
          }

          setStatus('success');
          onProfileLoaded(profile);
        } catch (error) {
          setStatus('error');
          setErrors([
            error instanceof Error ? error.message : 'Unknown error occurred',
          ]);
        }
      };

      reader.onerror = () => {
        setStatus('error');
        setErrors(['Failed to read file']);
      };

      reader.readAsText(file);
    },
    [onProfileLoaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const templateContent = `section,key,value,name,description,category,minYears,achieved,badgeIcon,proficiency,isRequired,seniority,objective,minDegree,preferredFields,certifications
role,,Customer & Technical Support Team Lead,,,,,,,,,JG2-JG3 equivalent,Support Paladin,,,
attribute,problemSolving,85,,,,,,,,,,,,
attribute,stakeholderManagement,90,,,,,,,,,,,,
attribute,technicalExpertise,75,,,,,,,,,,,,
attribute,leadership,80,,,,,,,,,,,,
attribute,customerFocus,95,,,,,,,,,,,,
attribute,adaptability,85,,,,,,,,,,,,
experience,,,Team Management,Led cross-functional support team,Leadership,3,true,Users,,,,,,
experience,,,Customer Support Systems,Experience with CRM and ticketing systems,Technical,5,true,Headphones,,,,,,
experience,,,Process Improvement,Implemented operational efficiency initiatives,Operations,2,false,TrendingUp,,,,,,
tool,,,Email Support,,Communication,,,,,95,true,,,,
tool,,,Phone Support,,Communication,,,,,90,true,,,,
tool,,,KPI Dashboard,,Analytics,,,,,80,true,,,,
tool,,,CRM System,,Technical,,,,,85,true,,,,
academic,,,,,,,,,,,,,"Bachelor's Degree","Business Administration;Communications;Computer Science","ITIL;Customer Service Excellence"
motivation,,Career advancement,,,,,,,,,,,,,
motivation,,Creating something new from the ground up,,,,,,,,,,,,,
motivation,,Solving complex problems,,,,,,,,,,,,,
painpoint,,Limited control over recruitment,,,,,,,,,,,,,
painpoint,,Slow decision-making processes,,,,,,,,,,,,,
week,,"Monday: Team all-hands, review weekend inquiries",,,,,,,,,,,,,
week,,"Tuesday-Thursday: Client operations, team coaching",,,,,,,,,,,,,
week,,"Friday: Week review, prioritization planning",,,,,,,,,,,,,`;

    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'success-profile-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStatus('idle');
    setErrors([]);
    setFileName('');
  };

  return (
    <div className="space-y-4">
      {/* Download template button */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Download className="w-4 h-4" />
        Download CSV Template
      </button>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-sats-blue bg-sats-blue/5'
            : 'border-gray-300 hover:border-gray-400',
          status === 'success' && 'border-sats-green bg-sats-green/5',
          status === 'error' && 'border-sats-red bg-sats-red/5'
        )}
      >
        <input {...getInputProps()} />

        {status === 'idle' && (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              {isDragActive
                ? 'Drop the CSV file here...'
                : 'Drag & drop a Success Profile CSV here'}
            </p>
            <p className="text-sm text-gray-400">or click to select a file</p>
          </>
        )}

        {status === 'parsing' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-sats-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Parsing {fileName}...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-sats-green" />
            <p className="text-sats-green font-medium mb-2">
              Profile loaded successfully!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <FileText className="w-4 h-4" />
              {fileName}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-sats-red" />
            <p className="text-sats-red font-medium mb-2">Upload failed</p>
            <div className="text-sm text-gray-500 mb-2">{fileName}</div>
          </>
        )}
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-sats-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 mb-1">
                  Validation Errors
                </p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={reset}
              className="p-1 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Current profile info */}
      {currentProfile && status === 'idle' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Current profile:{' '}
            <span className="font-medium text-gray-900">
              {currentProfile.role.title}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
