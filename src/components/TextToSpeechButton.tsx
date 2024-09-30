import React, { useContext, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SpeakerWaveIcon, StopCircleIcon } from '@heroicons/react/24/outline';
import { SpeechSettings } from '../models/SpeechSettings';
import { SpeechService } from '../service/SpeechService';
import { RotatingLines } from 'react-loader-spinner';
import { UserContext } from '../UserContext';
import { iconProps } from "../svg";
import { useTranslation } from "react-i18next";
import "./Button.css";
import Tooltip from './Tooltip';

interface TextToSpeechButtonProps {
  content: string;
  onAudioPlay: (isPlaying: boolean) => void; 
  autoPlay?: boolean;
}

const TextToSpeechButton = forwardRef((props: TextToSpeechButtonProps, ref) => {
  const { content, onAudioPlay , autoPlay} = props;
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [lastIdentifier, setLastIdentifier] = useState('');
  const audioRef = useRef(new Audio());
  const { userSettings } = useContext(UserContext);

  const speechSettings: SpeechSettings = {
    id: userSettings.speechModel || 'tts-1',
    voice: userSettings.speechVoice || 'alloy',
    speed: userSettings.speechSpeed || 1.0,
  };

  const simpleChecksum = (s: string) => {
    let checksum = 0;
    for (let i = 0; i < s.length; i++) {
      checksum = (checksum + s.charCodeAt(i) * (i + 1)) % 65535;
    }
    return checksum;
  };

  const generateIdentifier = (content: string, settings: SpeechSettings): string => {
    return `${simpleChecksum(content)}-${settings.id}-${settings.voice}-${settings.speed}`;
  };

  const currentIdentifier = generateIdentifier(content, speechSettings);

  const preprocessContent = (content: string) => {
    content = content.replace(/```[\s\S]*?```/g, ''); 
    return content;
  };

  const fetchAudio = async () => {
    if (currentIdentifier !== lastIdentifier) {
      setIsLoading(true);
      try {
        const processedContent = preprocessContent(content);
        const url = await SpeechService.textToSpeech(processedContent, speechSettings);
        audioRef.current.src = url;
        setAudioUrl(url);
        setLastIdentifier(currentIdentifier);
        audioRef.current.onplay = () => {
          setIsPlaying(true);
          onAudioPlay(true);
        };
        audioRef.current.onloadeddata = () => {
          audioRef.current.play();
          setIsPlaying(true);
          onAudioPlay(true); 
        };
      } catch (error) {
        console.error('Error fetching audio:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      onAudioPlay(true); 
    }
  };

  const handleClick = () => {
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      onAudioPlay(false); 
    } else if (!isLoading) {
      fetchAudio();
    }
  };
  useEffect(() => {
    if (autoPlay && !isPlaying && !isLoading) {
      fetchAudio();
    }
  }, [autoPlay, content]);
  useEffect(() => {
    audioRef.current.onended = () => {
      setIsPlaying(false);
      onAudioPlay(false); 
    };
  }, [onAudioPlay]);

  // Exposing methods to parent via ref
  useImperativeHandle(ref, () => ({
    startAudio: () => {
      if (!isLoading) {
        fetchAudio();
      }
    }
  }));

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`chat-action-button text-gray-400 inline-flex items-center justify-center p-2 ${
        isLoading || isPlaying ? 'active' : ''
      }`}
    >
      {isLoading ? (
        <Tooltip title={t('loading-ttd-button')} side="top" sideOffset={0}>
          <div>
            <RotatingLines
              ariaLabel="loading-indicator"
              width="16"
              strokeWidth="1"
              strokeColor="black"
            />
          </div>
        </Tooltip>
      ) : isPlaying ? (
        <Tooltip title={t('stop-read-aloud-button')} side="top" sideOffset={0}>
          <div>
            <StopCircleIcon {...iconProps} />
          </div>
        </Tooltip>
      ) : (
        <Tooltip title={t('read-aloud-button')} side="top" sideOffset={0}>
          <div>
            <SpeakerWaveIcon {...iconProps} />
          </div>
        </Tooltip>
      )}
    </button>
  );
});

export default TextToSpeechButton;
