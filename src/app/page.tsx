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
  const [isApiSectionOpen, setIsApiSectionOpen] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      // Validate the saved API key
      validateApiKey(savedApiKey);
      // Keep the API section closed by default when there's a saved key
      setIsApiSectionOpen(false);
    } else {
      // Open the section if there's no saved key
      setIsApiSectionOpen(true);
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
      // Check if the API key starts with "AI" (Gemini API keys typically start with this)
      if (!keyToValidate.startsWith('AI')) {
        throw new Error('API key should start with "AI"');
      }

      // Test the API key with a simple prompt
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': keyToValidate,
        },
        body: JSON.stringify({ text: 'Test API key.' }),
      });

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not OK:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setIsApiKeyValid(true);
      setApiKeyError('');
      // Save valid API key to localStorage
      localStorage.setItem('geminiApiKey', keyToValidate);
    } catch (error: any) {
      console.error('API Key validation error:', error);
      setApiKeyError(error.message || 'Invalid API key. Please check your key and try again.');
      setIsApiKeyValid(false);
      localStorage.removeItem('geminiApiKey');
    } finally {
      setIsValidating(false);
    }
  };

  // Function to force open API section if there's an error or no valid key
  useEffect(() => {
    if (apiKeyError || (!isApiKeyValid && !apiKey)) {
      setIsApiSectionOpen(true);
    } else if (isApiKeyValid) {
      // Close the section when API key is successfully validated
      setIsApiSectionOpen(false);
    }
  }, [apiKeyError, isApiKeyValid, apiKey]);

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
    if (apiKeyError) setApiKeyError('');
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Voice to SOP Notes</h1>
        
        {/* API Key Accordion */}
        <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100">
          <button 
            onClick={() => setIsApiSectionOpen(!isApiSectionOpen)}
            className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <FaKey className="text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-800">Gemini API Key</h2>
              {isApiKeyValid && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Verified
                </span>
              )}
            </div>
            <svg 
              className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${isApiSectionOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Collapsible section */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isApiSectionOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-4 border-t border-blue-50">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Enter your Gemini API key"
                  className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50 ${
                    apiKeyError ? 'border-red-500' : 'border-gray-200'
                  } transition-all duration-200`}
                  autoComplete="off"
                  data-lpignore="true"
                />
                <button
                  onClick={() => validateApiKey()}
                  disabled={isValidating || !apiKey.trim()}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium ${
                    isValidating
                      ? 'bg-gray-300 cursor-not-allowed'
                      : isApiKeyValid
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
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
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                    title="Clear saved API key"
                  >
                    Clear
                  </button>
                )}
              </div>
              {apiKeyError && (
                <div className="mt-2 text-red-500 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                  <FaExclamationCircle className="w-4 h-4" />
                  <span>{apiKeyError}</span>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {isApiKeyValid 
                  ? "Your API key is securely saved in your browser. Click 'Clear' to remove it."
                  : "Your API key will be securely saved in your browser until you clear it."}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Get a Gemini API key
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <VoiceRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            isDisabled={!isApiKeyValid}
          />
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6 border border-blue-100">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </div>
              </div>
              <span className="mt-4 text-gray-600 font-medium">Processing your recording...</span>
            </div>
          ) : sopNotes ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Generated SOP</h2>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    isCopied
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
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
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="ml-3 text-xs text-gray-500 font-medium">SOP Markdown</span>
                </div>
                <pre className="whitespace-pre-wrap text-black font-mono text-sm p-5 bg-gray-50 max-h-[600px] overflow-y-auto">
                  {sopNotes}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">
                Your SOP notes will appear here after recording
              </p>
              <p className="text-gray-400 text-sm mt-2 max-w-md">
                Use the voice recorder above to dictate your process, and Gemini AI will format it into a professional SOP
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
