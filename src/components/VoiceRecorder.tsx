'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FaMicrophone, FaPause, FaStop, FaPaperPlane, FaLink, FaKeyboard, FaMarkdown } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
}

export default function VoiceRecorder({ onTranscriptionComplete, isDisabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
          let interimText = '';
          let finalText = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript + ' ';
            } else {
              interimText += result[0].transcript;
            }
          }

          if (finalText) {
            setFinalTranscript(prev => prev + finalText);
          }
          setInterimTranscript(interimText);
        };

        setRecognition(recognition);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (recognition && !isDisabled) {
      setFinalTranscript(''); // Clear previous transcript when starting new recording
      
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
      setIsPaused(true);
      setIsRecording(false);
    }
  }, [recognition, isRecording]);

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
      
      // Submit the final transcript
      if (finalTranscript.trim()) {
        onTranscriptionComplete(finalTranscript.trim());
      }
      
      // Reset states
      setFinalTranscript('');
      setInterimTranscript('');
      
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    }
  }, [recognition, finalTranscript, onTranscriptionComplete]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    };
  }, []);

  const handleAddLink = useCallback(async () => {
    if (!isDisabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim() && isValidUrl(clipboardText)) {
          setFinalTranscript(prev => {
            const newText = prev + ` (${clipboardText}) `;
            // If recording is active, we want to keep the current state
            if (!isRecording && !isPaused) {
              onTranscriptionComplete(newText.trim());
              return '';
            }
            return newText;
          });
        } else {
          alert('Please copy a valid URL to your clipboard first');
        }
      } catch (error) {
        alert('Unable to read clipboard. Please make sure you have a valid URL copied.');
      }
    }
  }, [isDisabled, isRecording, isPaused, onTranscriptionComplete]);

  const handleAddMarkdown = useCallback(async () => {
    if (!isDisabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim()) {
          const indentedMarkdown = clipboardText
            .split('\n')
            .map(line => `    ${line}`)
            .join('\n');
          setFinalTranscript(prev => {
            const newText = prev + `\n\n${indentedMarkdown}\n\n`;
            // If recording is active, we want to keep the current state
            if (!isRecording && !isPaused) {
              onTranscriptionComplete(newText.trim());
              return '';
            }
            return newText;
          });
        } else {
          alert('Please copy some markdown content to your clipboard first');
        }
      } catch (error) {
        alert('Unable to read clipboard. Please make sure you have content copied.');
      }
    }
  }, [isDisabled, isRecording, isPaused, onTranscriptionComplete]);

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="flex flex-col items-center gap-6 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                if (!isRecording && !isPaused) {
                  startRecording();
                } else if (isRecording) {
                  pauseRecording();
                } else if (isPaused) {
                  resumeRecording();
                }
              }}
              disabled={isDisabled}
              className={`p-4 w-14 h-14 flex items-center justify-center rounded-full transition-all shadow-md hover:shadow-lg ${
                isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : isPaused
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600'
                  : isRecording
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {isPaused ? (
                <FaMicrophone className="w-5 h-5 text-white" />
              ) : isRecording ? (
                <FaPause className="w-5 h-5 text-white" />
              ) : (
                <FaMicrophone className="w-5 h-5 text-white" />
              )}
            </button>
            <span className="text-xs font-medium text-gray-700 mt-1">
              {isPaused ? 'Resume' : isRecording ? 'Pause' : 'Record'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleAddLink}
              disabled={isDisabled}
              className={`p-4 w-14 h-14 flex items-center justify-center rounded-full transition-all shadow-md hover:shadow-lg ${
                isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
              }`}
            >
              <FaLink className="w-5 h-5 text-white" />
            </button>
            <span className="text-xs font-medium text-gray-700 mt-1">Add Link</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleAddMarkdown}
              disabled={isDisabled}
              className={`p-4 w-14 h-14 flex items-center justify-center rounded-full transition-all shadow-md hover:shadow-lg ${
                isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700'
              }`}
            >
              <FaMarkdown className="w-5 h-5 text-white" />
            </button>
            <span className="text-xs font-medium text-gray-700 mt-1">Add Markdown</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={stopAndSubmit}
              disabled={isDisabled || (!isRecording && !isPaused && !finalTranscript)}
              className={`p-4 w-14 h-14 flex items-center justify-center rounded-full transition-all shadow-md hover:shadow-lg ${
                isDisabled || (!isRecording && !isPaused && !finalTranscript)
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
              }`}
            >
              <FaPaperPlane className="w-5 h-5 text-white" />
            </button>
            <span className="text-xs font-medium text-gray-700 mt-1">Submit</span>
          </div>
        </div>

        {(isRecording || isPaused || finalTranscript) && (
          <div className="mt-4 p-5 bg-gray-50 rounded-lg w-full border border-gray-200 shadow-inner">
            {isRecording && (
              <div className="relative flex justify-center mb-4">
                <div className="absolute flex space-x-2 opacity-75">
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    className="h-3 w-3 rounded-full bg-blue-400"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    className="h-3 w-3 rounded-full bg-blue-400"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                    className="h-3 w-3 rounded-full bg-blue-400"
                  />
                </div>
              </div>
            )}
            <div className="text-sm text-gray-600">
              {finalTranscript && (
                <p className="font-medium mb-3 whitespace-pre-wrap">{finalTranscript}</p>
              )}
              {interimTranscript && (
                <motion.p 
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-gray-500 italic"
                >
                  {interimTranscript}
                </motion.p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
        <div className="flex items-center gap-2 mb-5">
          <FaKeyboard className="text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Start/Pause Recording</span>
            <kbd className="px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt + P</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-purple-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Insert Link from Clipboard</span>
            <kbd className="px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt + O</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-indigo-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Insert Markdown from Clipboard</span>
            <kbd className="px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt + I</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-gray-50 to-green-50 p-3 rounded-lg border border-gray-100">
            <span className="font-medium text-gray-700">Submit Recording</span>
            <kbd className="px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-xs font-mono text-gray-800">Alt + S</kbd>
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