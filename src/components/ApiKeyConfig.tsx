import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle, Sparkles, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ApiKeyConfigProps {
  onApiKeyChange: (apiKey: string | null) => void;
  className?: string;
}

const API_KEY_STORAGE_KEY = 'claude_api_key';

export function ApiKeyConfig({ onApiKeyChange, className }: ApiKeyConfigProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setIsConfigured(true);
      onApiKeyChange(savedKey);
    }
  }, [onApiKeyChange]);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsConfigured(true);
      setIsEditing(false);
      onApiKeyChange(apiKey.trim());
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setIsConfigured(false);
    setIsEditing(false);
    onApiKeyChange(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveKey();
    }
  };

  const maskedKey = apiKey ? `sk-...${apiKey.slice(-8)}` : '';

  return (
    <div className={cn('bg-gradient-to-r from-sats-purple/5 to-sats-blue/5 border border-sats-purple/20 rounded-lg p-4', className)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sats-purple to-sats-blue flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">Claude AI Integration</h4>
            {isConfigured && !isEditing && (
              <span className="flex items-center gap-1 text-xs text-sats-green bg-sats-green/10 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" />
                Active
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Enable AI-powered resume parsing for more accurate extraction of attributes, experiences, and skill proficiencies.
          </p>

          {!isConfigured && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-2 bg-sats-purple text-white rounded-lg hover:bg-sats-purple/90 transition-colors text-sm font-medium"
            >
              <Key className="w-4 h-4" />
              Add API Key
            </button>
          ) : isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sats-purple/50 focus:border-sats-purple text-sm"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveKey}
                  disabled={!apiKey.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sats-green text-white rounded-lg hover:bg-sats-green/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    if (isConfigured) {
                      const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
                      setApiKey(savedKey || '');
                    } else {
                      setApiKey('');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Your API key is stored locally in your browser and is only used for resume parsing requests.
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sats-blue hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <Key className="w-4 h-4 text-gray-500" />
                <code className="text-sm text-gray-600">{maskedKey}</code>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-sats-blue hover:underline"
              >
                Edit
              </button>
              <button
                onClick={handleRemoveKey}
                className="flex items-center gap-1 text-sm text-red-600 hover:underline"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
