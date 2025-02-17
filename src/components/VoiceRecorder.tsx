'use client';

import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        setRecognition(recognition);
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (recognition && !isDisabled) {
      recognition.onresult = (event) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setFinalTranscript(prev => prev + transcript + ' ');
          } else {
            currentInterim += transcript;
          }
        }
        
        setInterimTranscript(currentInterim);
      };

      recognition.start();
      setIsRecording(true);
      setIsPaused(false);
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
      recognition.start();
      setIsPaused(false);
      setIsRecording(true);
    }
  }, [recognition, isPaused]);

  const stopAndSubmit = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (finalTranscript.trim()) {
        onTranscriptionComplete(finalTranscript.trim());
      }
      setFinalTranscript('');
      setInterimTranscript('');
    }
  }, [recognition, finalTranscript, onTranscriptionComplete]);

  const handleAddLink = useCallback(async () => {
    if (!isDisabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim() && isValidUrl(clipboardText)) {
          setFinalTranscript(prev => prev + ` (${clipboardText}) `);
        } else {
          alert('Please copy a valid URL to your clipboard first');
        }
      } catch (error) {
        alert('Unable to read clipboard. Please make sure you have a valid URL copied.');
      }
    }
  }, [isDisabled]);

  const handleAddMarkdown = useCallback(async () => {
    if (!isDisabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim()) {
          const indentedMarkdown = clipboardText
            .split('\n')
            .map(line => `    ${line}`)
            .join('\n');
          setFinalTranscript(prev => prev + `\n\n${indentedMarkdown}\n\n`);
        } else {
          alert('Please copy some markdown content to your clipboard first');
        }
      } catch (error) {
        alert('Unable to read clipboard. Please make sure you have content copied.');
      }
    }
  }, [isDisabled]);

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
      {/* Left Column - Buttons */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
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
              className={`p-4 rounded-full transition-all ${
                isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : isPaused
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isPaused ? (
                <FaMicrophone className="w-6 h-6 text-white" />
              ) : isRecording ? (
                <FaPause className="w-6 h-6 text-white" />
              ) : (
                <FaMicrophone className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-sm font-medium text-gray-700">
              {isPaused ? 'Resume' : isRecording ? 'Pause' : 'Record'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAddLink}
              disabled={isDisabled}
              className={`p-4 rounded-full transition-all ${
                isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <FaLink className="w-6 h-6 text-white" />
            </button>
            <span className="text-sm font-medium text-gray-700">Add Link</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAddMarkdown}
              disabled={isDisabled}
              className={`p-4 rounded-full transition-all ${
                isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              <FaMarkdown className="w-6 h-6 text-white" />
            </button>
            <span className="text-sm font-medium text-gray-700">Add Markdown</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={stopAndSubmit}
              disabled={isDisabled || (!isRecording && !isPaused && !finalTranscript)}
              className={`p-4 rounded-full transition-all ${
                isDisabled || (!isRecording && !isPaused && !finalTranscript)
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              <FaPaperPlane className="w-6 h-6 text-white" />
            </button>
            <span className="text-sm font-medium text-gray-700">Submit</span>
          </div>
        </div>

        {(isRecording || isPaused) && (finalTranscript || interimTranscript) && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg w-full">
            {isRecording && (
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-4"
              />
            )}
            <div className="text-sm text-gray-600">
              {finalTranscript && (
                <p className="font-medium mb-2 whitespace-pre-wrap">{finalTranscript}</p>
              )}
              {interimTranscript && (
                <p className="text-gray-400">{interimTranscript}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Instructions */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <FaKeyboard className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-800">Keyboard Shortcuts</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
            <span className="font-medium text-gray-700">Start/Pause Recording</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded shadow-sm text-xs font-mono text-gray-800">Alt + P</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
            <span className="font-medium text-gray-700">Insert Link from Clipboard</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded shadow-sm text-xs font-mono text-gray-800">Alt + O</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
            <span className="font-medium text-gray-700">Insert Markdown from Clipboard</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded shadow-sm text-xs font-mono text-gray-800">Alt + I</kbd>
          </div>
          <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
            <span className="font-medium text-gray-700">Submit Recording</span>
            <kbd className="px-2 py-1 bg-white border border-gray-200 rounded shadow-sm text-xs font-mono text-gray-800">Alt + S</kbd>
          </div>
        </div>
        {isDisabled && (
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
            Enter API key to enable recording
          </div>
        )}
      </div>
    </div>
  );
}