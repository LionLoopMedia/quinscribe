'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FaMicrophone, FaPause, FaStop, FaPaperPlane, FaLink, FaKeyboard, FaMarkdown } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
  isVoiceMode: boolean;
  setIsVoiceMode: (value: boolean) => void;
  manualText: string;
  setManualText: (value: string) => void;
  onManualSubmit: () => void;
}

export default function VoiceRecorder({ onTranscriptionComplete, isDisabled = false, isVoiceMode, setIsVoiceMode, manualText, setManualText, onManualSubmit }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resultsRef = useRef<Array<SpeechRecognitionResult>>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !recognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = 'en-US';

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            setInterimTranscript('No speech detected. Please try again.');
          } else if (event.error === 'audio-capture') {
            setInterimTranscript('No microphone detected. Please check your settings.');
          } else if (event.error === 'not-allowed') {
            setInterimTranscript('Microphone access denied. Please allow microphone access.');
          }
          setIsRecording(false);
          setIsPaused(false);
        };

        recognition.onend = () => {
          if (isRecording && !isPaused) {
            try {
              recognition.start();
            } catch (error) {
              console.error('Error restarting recognition:', error);
            }
          }
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (isPaused) return;

          const results = Array.from(event.results);
          
          const latestResult = results[results.length - 1];
          if (!latestResult.isFinal) {
            setInterimTranscript(latestResult[0].transcript);
          } else {
            setFinalTranscript(prev => {
              const spacer = prev ? ' ' : '';
              return prev + spacer + latestResult[0].transcript;
            });
            setInterimTranscript('');
          }
        };

        setRecognition(recognition);
        recognitionRef.current = recognition;
      }
    }
  }, [recognition]);

  const startRecording = useCallback(() => {
    if (recognition && !isDisabled) {
      setFinalTranscript('');
      setInterimTranscript('');
      resultsRef.current = [];
      
      try {
        recognition.start();
        setIsRecording(true);
        setIsPaused(false);
      } catch (error) {
        console.error('Error starting recognition:', error);
        setInterimTranscript('Error starting recording. Please try again.');
      }
    }
  }, [recognition, isDisabled]);

  const pauseRecording = useCallback(() => {
    if (recognition && isRecording) {
      recognition.stop();
      
      if (interimTranscript) {
        setFinalTranscript(prev => {
          const spacer = prev ? ' ' : '';
          return prev + spacer + interimTranscript;
        });
        setInterimTranscript('');
      }
      
      setIsPaused(true);
      setIsRecording(false);
    }
  }, [recognition, isRecording, interimTranscript]);

  const resumeRecording = useCallback(() => {
    if (recognition && isPaused) {
      try {
        recognition.start();
        setIsPaused(false);
        setIsRecording(true);
      } catch (error) {
        console.error('Error resuming recognition:', error);
        setInterimTranscript('Error resuming recording. Please try again.');
      }
    }
  }, [recognition, isPaused]);

  const stopAndSubmit = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      let completeTranscript = finalTranscript;
      if (interimTranscript) {
        const spacer = completeTranscript ? ' ' : '';
        completeTranscript += spacer + interimTranscript;
      }
      
      if (completeTranscript.trim()) {
        onTranscriptionComplete(completeTranscript.trim());
      }
      
      setFinalTranscript('');
      setInterimTranscript('');
      resultsRef.current = [];
    }
  }, [recognition, finalTranscript, interimTranscript, onTranscriptionComplete]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleAddLink = useCallback(async () => {
    if (!isDisabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim() && isValidUrl(clipboardText)) {
          const linkText = ` (${clipboardText}) `;
          
          setFinalTranscript(prev => prev + linkText);
          
          if (!isRecording && !isPaused) {
            const newText = finalTranscript + linkText;
            onTranscriptionComplete(newText.trim());
            setFinalTranscript('');
          }
        } else {
          alert('Please copy a valid URL to your clipboard first');
        }
      } catch (error) {
        alert('Unable to read clipboard. Please make sure you have a valid URL copied.');
      }
    }
  }, [isDisabled, isRecording, isPaused, finalTranscript, onTranscriptionComplete]);

  const handleAddMarkdown = useCallback(async () => {
    if (!isDisabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim()) {
          const indentedMarkdown = clipboardText
            .split('\n')
            .map(line => `    ${line}`)
            .join('\n');
          
          const markdownText = `\n\n${indentedMarkdown}\n\n`;
          
          setFinalTranscript(prev => prev + markdownText);
          
          if (!isRecording && !isPaused) {
            const newText = finalTranscript + markdownText;
            onTranscriptionComplete(newText.trim());
            setFinalTranscript('');
          }
        } else {
          alert('Please copy some markdown content to your clipboard first');
        }
      } catch (error) {
        alert('Unable to read clipboard. Please make sure you have content copied.');
      }
    }
  }, [isDisabled, isRecording, isPaused, finalTranscript, onTranscriptionComplete]);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.altKey) {
        if (event.code === 'KeyP') {
          event.preventDefault();
          if (!isRecording && !isPaused) {
            startRecording();
          } else if (isRecording) {
            pauseRecording();
          } else if (isPaused) {
            resumeRecording();
          }
        } else if (event.code === 'KeyO') {
          event.preventDefault();
          handleAddLink();
        } else if (event.code === 'KeyI') {
          event.preventDefault();
          handleAddMarkdown();
        } else if (event.code === 'KeyS') {
          event.preventDefault();
          if (!isDisabled && (isRecording || isPaused || finalTranscript)) {
            stopAndSubmit();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRecording, isPaused, startRecording, pauseRecording, resumeRecording, handleAddLink, handleAddMarkdown, stopAndSubmit, isDisabled, finalTranscript]);

  return (
    <div className="grid grid-cols-12 gap-8 items-start">
      <div className="col-span-8 flex flex-col items-center gap-6 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
        {/* Mode Toggle */}
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center justify-center w-full">
            <div className="bg-gray-100 p-1.5 rounded-lg flex gap-1">
              <button
                onClick={() => setIsVoiceMode(true)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-300 ${
                  isVoiceMode
                    ? 'bg-white text-blue-500 shadow'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <FaMicrophone className="w-4 h-4" />
                <span className="text-xs font-medium">Voice</span>
              </button>
              <button
                onClick={() => setIsVoiceMode(false)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-300 ${
                  !isVoiceMode
                    ? 'bg-white text-blue-500 shadow'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <FaKeyboard className="w-4 h-4" />
                <span className="text-xs font-medium">Text</span>
              </button>
            </div>
            {!isVoiceMode && (
              <button
                onClick={onManualSubmit}
                disabled={isDisabled || !manualText.trim()}
                className="flex flex-col items-center gap-1 ml-4"
              >
                <div className={`p-3 rounded-lg transition-all duration-300 ${
                  isDisabled || !manualText.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white shadow hover:bg-blue-600'
                }`}>
                  <FaPaperPlane className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-600">Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons - Only show in Voice mode */}
        {isVoiceMode && (
          <div className="flex items-center justify-center gap-4 bg-gray-50 px-6 py-4 rounded-xl w-full">
            <button
              onClick={isRecording ? pauseRecording : startRecording}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-3 rounded-lg transition-all duration-300 ${
                isDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isRecording
                  ? 'bg-red-500 text-white shadow hover:bg-red-600'
                  : 'bg-white text-gray-600 shadow hover:bg-gray-50'
              }`}>
                {isRecording ? <FaPause className="w-4 h-4" /> : <FaMicrophone className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium text-gray-600">{isRecording ? 'Pause' : 'Record'}</span>
            </button>
            <button
              onClick={handleAddLink}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-3 rounded-lg transition-all duration-300 ${
                isDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-600 shadow hover:bg-gray-50'
              }`}>
                <FaLink className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Add Link</span>
            </button>
            <button
              onClick={handleAddMarkdown}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-3 rounded-lg transition-all duration-300 ${
                isDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-600 shadow hover:bg-gray-50'
              }`}>
                <FaMarkdown className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Add MD</span>
            </button>
            <button
              onClick={stopAndSubmit}
              disabled={isDisabled || (!isRecording && !isPaused && !finalTranscript)}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-3 rounded-lg transition-all duration-300 ${
                isDisabled || (!isRecording && !isPaused && !finalTranscript)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white shadow hover:bg-blue-600'
              }`}>
                <FaPaperPlane className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Submit</span>
            </button>
          </div>
        )}

        {isVoiceMode ? (
          <div className="w-full">
            <div className="relative w-full">
              <textarea
                value={finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')}
                readOnly
                placeholder="Your recording transcript will appear here..."
                className="w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50 resize-none"
              />
              {isRecording && (
                <motion.div
                  className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => {
                if (e.altKey && e.key.toLowerCase() === 's') {
                  e.preventDefault();
                  onManualSubmit();
                }
              }}
              placeholder="Type your notes here... Press Alt+S to submit"
              className="w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50 resize-none"
              disabled={isDisabled}
            />
          </div>
        )}
      </div>

      <div className="col-span-4 bg-white rounded-xl p-6 shadow-lg border border-blue-100">
        <div className="flex items-center gap-2 mb-5">
          <FaKeyboard className="text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Shortcuts</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Record/Pause</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt+P</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-purple-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Add Link</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt+O</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-indigo-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Add MD</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt+I</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-green-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Submit</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt+S</kbd>
          </div>
        </div>
        {isDisabled && (
          <div className="mt-5 text-sm text-gray-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
              API Key Required
            </div>
            <p>Enter your Gemini API key above to enable recording and transcription</p>
          </div>
        )}
      </div>
    </div>
  );
}