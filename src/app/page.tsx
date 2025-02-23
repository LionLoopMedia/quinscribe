'use client';

import { useState, useEffect } from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { FaSpinner, FaKey, FaCopy, FaCheck, FaExclamationCircle } from 'react-icons/fa';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sopNotes, setSopNotes] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      // Validate the saved API key
      validateApiKey(savedApiKey);
    }
  }, []);

  // Clear API key when component unmounts or page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't clear from localStorage on page unload anymore
      setApiKey('');
      setIsApiKeyValid(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Prevent browser's password manager from saving the API key
  useEffect(() => {
    const input = document.querySelector('input[type="password"]');
    if (input) {
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('data-lpignore', 'true');
    }
  }, []);

  const clearApiKey = () => {
    localStorage.removeItem('geminiApiKey');
    setApiKey('');
    setIsApiKeyValid(false);
    setApiKeyError('');
  };

  const validateApiKey = async (keyToValidate = apiKey) => {
    if (!keyToValidate.trim()) {
      setApiKeyError('Please enter an API key');
      setIsApiKeyValid(false);
      return;
    }

    setIsValidating(true);
    setApiKeyError('');

    try {
      // Test the API key with a simple prompt
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': keyToValidate,
        },
        body: JSON.stringify({ text: 'Test API key.' }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setIsApiKeyValid(true);
      setApiKeyError('');
      // Save valid API key to localStorage
      localStorage.setItem('geminiApiKey', keyToValidate);
    } catch (error) {
      console.error('API Key validation error:', error);
      setApiKeyError('Invalid API key. Please check your key and try again.');
      setIsApiKeyValid(false);
      localStorage.removeItem('geminiApiKey');
    } finally {
      setIsValidating(false);
    }
  };

  const handleTranscriptionComplete = async (text: string) => {
    if (!apiKey) {
      setApiKeyError('Please enter your Gemini API key first');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setSopNotes(data.content);
      setIsCopied(false);
    } catch (error) {
      console.error('Error processing text:', error);
      setApiKeyError('Failed to process the text. Please check your API key and try again.');
      setIsApiKeyValid(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    setApiKeyError('');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sopNotes);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy text to clipboard');
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Voice to SOP Notes</h1>
        
        <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaKey className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Gemini API Key</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter your Gemini API key"
              className={`flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                apiKeyError ? 'border-red-500' : ''
              }`}
              autoComplete="off"
              data-lpignore="true"
            />
            <button
              onClick={() => validateApiKey()}
              disabled={isValidating || !apiKey.trim()}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                isValidating
                  ? 'bg-gray-300 cursor-not-allowed'
                  : isApiKeyValid
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isValidating ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : isApiKeyValid ? (
                <>
                  <FaCheck className="w-4 h-4" />
                  <span>Verified</span>
                </>
              ) : (
                'Verify API Key'
              )}
            </button>
            {isApiKeyValid && (
              <button
                onClick={clearApiKey}
                className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-all"
                title="Clear saved API key"
              >
                Clear
              </button>
            )}
          </div>
          {apiKeyError && (
            <div className="mt-2 text-red-500 text-sm flex items-center gap-2">
              <FaExclamationCircle className="w-4 h-4" />
              <span>{apiKeyError}</span>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {isApiKeyValid 
              ? "Your API key is securely saved in your browser. Click 'Clear' to remove it."
              : "Your API key will be securely saved in your browser until you clear it."}
          </p>
        </div>

        <div className="mb-8">
          <VoiceRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            isDisabled={!isApiKeyValid}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Processing your recording...</span>
            </div>
          ) : sopNotes ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Generated SOP</h2>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <>
                      <FaCheck className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <FaCopy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-black font-mono text-sm p-4 bg-gray-50 rounded-md">
                {sopNotes}
              </pre>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Your SOP notes will appear here after recording
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
