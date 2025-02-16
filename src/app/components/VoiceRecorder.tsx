'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
}

export default function VoiceRecorder({ onTranscriptionComplete, isDisabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

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
      let finalTranscript = '';
      
      recognition.onresult = (event) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }
        
        setInterimTranscript(currentInterim);
      };

      recognition.onend = () => {
        if (finalTranscript) {
          onTranscriptionComplete(finalTranscript.trim());
        }
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognition.start();
      setIsRecording(true);
    }
  }, [recognition, onTranscriptionComplete, isDisabled]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
      setInterimTranscript('');
    }
  }, [recognition]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isDisabled}
        className={`p-4 rounded-full transition-all ${
          isDisabled
            ? 'bg-gray-300 cursor-not-allowed'
            : isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isRecording ? (
          <FaStop className="w-6 h-6 text-white" />
        ) : (
          <FaMicrophone className="w-6 h-6 text-white" />
        )}
      </button>
      <p className="text-sm text-gray-600">
        {isDisabled
          ? 'Enter API key to enable recording'
          : isRecording
          ? 'Recording... Click to stop'
          : 'Click to start recording'}
      </p>
      <p className="text-xs text-gray-500">Or press Ctrl + Space</p>
      {isRecording && interimTranscript && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
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
          <p className="text-sm text-gray-600">{interimTranscript}</p>
        </div>
      )}
    </div>
  );
} 