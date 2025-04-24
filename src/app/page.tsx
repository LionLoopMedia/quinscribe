'use client';

import { useState, useEffect } from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { FaSpinner, FaKey, FaCopy, FaCheck, FaExclamationCircle, FaMicrophone, FaKeyboard, FaExchangeAlt } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sopNotes, setSopNotes] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [isApiSectionOpen, setIsApiSectionOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [manualText, setManualText] = useState('');
  const [outputMode, setOutputMode] = useState('sop'); // 'sop' or 'guide'
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [wordToReplace, setWordToReplace] = useState('');
  const [replacementWord, setReplacementWord] = useState('');

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
      // Test the API key with a minimal prompt
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': keyToValidate,
        },
        body: JSON.stringify({ text: 'Test.' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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
      setApiKeyError(error.message || 'Failed to validate API key. Please try again.');
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

    // Add validation for text size (Gemini has limitations with large inputs)
    const textSizeInBytes = new Blob([text]).size;
    const maxSizeInBytes = 250000; // ~250KB limit
    
    if (textSizeInBytes > maxSizeInBytes) {
      setApiKeyError(`Text is too large (${Math.round(textSizeInBytes/1024)}KB). Please reduce to under ${Math.round(maxSizeInBytes/1024)}KB.`);
      setIsApiKeyValid(true); // Keep API key valid
      return;
    }

    // Track retries
    let retryCount = 0;
    const maxRetries = 2;
    
    try {
      setIsProcessing(true);
      
      // Retry loop for handling transient errors
      while (retryCount <= maxRetries) {
        try {
          const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
            },
            body: JSON.stringify({ text, mode: outputMode }),
          });
    
          // Check if the response is ok before trying to parse JSON
          if (!response.ok) {
            let errorMessage = `Server responded with status ${response.status}`;
            
            // Try to parse error JSON, but handle cases where it's not valid JSON
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (jsonError) {
              // If response is not valid JSON, try to get text
              try {
                const errorText = await response.text();
                errorMessage = errorText.substring(0, 150) + (errorText.length > 150 ? '...' : '');
              } catch (textError) {
                // If we couldn't get text either, keep the default error message
              }
            }
            
            // If it's a Gateway Timeout (504) and we have retries left, retry
            if (response.status === 504 && retryCount < maxRetries) {
              console.log(`Gateway timeout, retrying (${retryCount + 1}/${maxRetries})...`);
              retryCount++;
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            throw new Error(errorMessage);
          }
    
          // Safely parse JSON with recovery attempts
          let responseText;
          try {
            responseText = await response.text();
          } catch (textError) {
            throw new Error('Failed to read response body');
          }
          
          let data;
          try {
            // Try to parse the JSON response
            data = JSON.parse(responseText);
          } catch (jsonError) {
            // If it fails, check if we can recover the JSON by fixing common issues
            console.error('JSON parse error:', jsonError);
            
            // Check if we need to retry due to malformed response
            if (retryCount < maxRetries) {
              console.log(`Received malformed JSON, retrying (${retryCount + 1}/${maxRetries})...`);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            throw new Error('Failed to parse response as JSON. The server returned an invalid response.');
          }
    
          if (data.error) {
            throw new Error(data.error);
          }
    
          setSopNotes(data.content);
          setIsCopied(false);
          
          // If we reach this point, we succeeded, so break out of the retry loop
          break;
        } catch (innerError) {
          // If this is our last retry, rethrow the error for the outer catch
          if (retryCount >= maxRetries) {
            throw innerError;
          }
          // Otherwise, increment retry count and continue
          retryCount++;
          console.log(`Error occurred, retrying (${retryCount}/${maxRetries})...`, innerError);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Error processing text:', error);
      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('payload') && errorMessage.includes('size')) {
        setApiKeyError('Text is too large. Please reduce the amount of text and try again.');
      } else if (errorMessage.includes('Gateway Timeout') || errorMessage.includes('504')) {
        setApiKeyError('Server timeout. Your request took too long to process. Please try with a smaller text input.');
      } else if (errorMessage.includes('parse') || errorMessage.includes('JSON') || errorMessage.includes('Unexpected token')) {
        setApiKeyError('Received an invalid response from the server. This may be due to network issues or server-side errors.');
      } else {
        setApiKeyError('Failed to process the text: ' + errorMessage);
        // Only invalidate API key for authorization errors
        if (errorMessage.includes('API key') || errorMessage.includes('auth') || errorMessage.includes('401')) {
          setIsApiKeyValid(false);
        }
      }
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

  const handleReplaceWord = () => {
    if (!wordToReplace.trim()) return;
    
    const updatedText = sopNotes.replace(new RegExp(wordToReplace, 'gi'), replacementWord);
    setSopNotes(updatedText);
    
    // Reset the form
    setWordToReplace('');
    setReplacementWord('');
    setIsReplaceModalOpen(false);
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    
    // Check input text size before submission
    const textSizeInBytes = new Blob([manualText]).size;
    const maxSizeInBytes = 250000; // ~250KB limit
    
    if (textSizeInBytes > maxSizeInBytes) {
      setApiKeyError(`Text is too large (${Math.round(textSizeInBytes/1024)}KB). Please reduce to under ${Math.round(maxSizeInBytes/1024)}KB.`);
      return;
    }
    
    await handleTranscriptionComplete(manualText);
    setManualText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Voice to {outputMode === 'sop' ? 'SOP' : 'Guide'}</h1>
        
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

        {/* Mode Selector */}
        <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800">Output Mode</h2>
          </div>
          
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => setOutputMode('sop')}
              className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                outputMode === 'sop'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              SOP Mode
            </button>
            <button
              onClick={() => setOutputMode('guide')}
              className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                outputMode === 'guide'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Guide Mode
            </button>
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            {outputMode === 'sop' ? (
              <p>SOP Mode creates step-by-step procedures with clear, actionable instructions.</p>
            ) : (
              <p>Guide Mode generates educational content with explanations, examples, and best practices.</p>
            )}
          </div>
        </div>

        {/* Voice Recorder Section */}
        <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100">
          <div className="p-6">
            <VoiceRecorder 
              onTranscriptionComplete={handleTranscriptionComplete}
              isDisabled={!isApiKeyValid}
              isVoiceMode={isVoiceMode}
              setIsVoiceMode={setIsVoiceMode}
              manualText={manualText}
              setManualText={setManualText}
              onManualSubmit={handleManualSubmit}
            />
          </div>
        </div>

        {/* Loading State */}
        {isProcessing && (
          <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100 p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </div>
              </div>
              <span className="mt-4 text-gray-600 font-medium">Creating your {outputMode === 'sop' ? 'SOP' : 'Guide'}...</span>
              <p className="text-sm text-gray-500 mt-2">This may take up to 30 seconds</p>
            </div>
          </div>
        )}

        {/* Output Section */}
        {sopNotes && !isProcessing && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100">
            <div className="flex justify-between items-center mb-4 p-4">
              <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Generated {outputMode === 'sop' ? 'SOP' : 'Guide'}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReplaceModalOpen(true)}
                  className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 transition-colors py-2 px-3 rounded-lg text-gray-700"
                >
                  <FaExchangeAlt className="w-4 h-4" />
                  <span>Replace Word</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 transition-colors py-2 px-3 rounded-lg text-gray-700"
                >
                  {isCopied ? (
                    <>
                      <FaCheck className="w-4 h-4 text-green-500" />
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
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="ml-3 text-xs text-gray-500 font-medium">{outputMode === 'sop' ? 'SOP' : 'Guide'} Markdown</span>
              </div>
              <pre className="whitespace-pre-wrap text-black font-mono text-sm p-5 bg-white max-h-[600px] overflow-y-auto">
                {sopNotes}
              </pre>
            </div>
          </div>
        )}
        
        {/* Empty State when no SOP/Guide is generated yet */}
        {!sopNotes && !isProcessing && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100 p-8">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">
                Your {outputMode === 'sop' ? 'SOP' : 'Guide'} will appear here
              </p>
              <p className="text-gray-400 text-sm mt-2 max-w-md">
                {isVoiceMode 
                  ? `Use the voice recorder above to dictate your process, and Gemini AI will format it into a professional ${outputMode === 'sop' ? 'SOP' : 'Guide'}`
                  : `Type your content in the text area above, and Gemini AI will format it into a professional ${outputMode === 'sop' ? 'SOP' : 'Guide'}`}
              </p>
            </div>
          </div>
        )}

        {/* Word Replacement Modal */}
        {isReplaceModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-blue-100 p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-blue-50 p-2 rounded-full">
                  <FaExchangeAlt className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Replace Word</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="word-to-replace" className="block text-sm font-medium text-gray-700 mb-2">
                    Word to replace
                  </label>
                  <input
                    id="word-to-replace"
                    type="text"
                    value={wordToReplace}
                    onChange={(e) => setWordToReplace(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50"
                    placeholder="Find this word"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label htmlFor="replacement-word" className="block text-sm font-medium text-gray-700 mb-2">
                    Replacement word
                  </label>
                  <input
                    id="replacement-word"
                    type="text"
                    value={replacementWord}
                    onChange={(e) => setReplacementWord(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50"
                    placeholder="Replace with this word"
                  />
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      onClick={() => setIsReplaceModalOpen(false)}
                      className="px-5 py-2.5 rounded-lg transition-all duration-200 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReplaceWord}
                      disabled={!wordToReplace.trim() || !replacementWord.trim()}
                      className={`px-5 py-2.5 rounded-lg transition-all duration-200 font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        !wordToReplace.trim() || !replacementWord.trim()
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      Replace
                    </button>
                  </div>
                </div>
                
                {wordToReplace && replacementWord && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <p>Will replace: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200">{wordToReplace}</span></p>
                    <p className="mt-1">With: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200">{replacementWord}</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
