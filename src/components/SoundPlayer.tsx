import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

// Sound definitions - can be frequency (number), noise type (string), or audio file (object)
export type SoundType = number | 'pink' | 'brown' | 'green' | 'white' | 'bath' | { type: 'file'; path: string };

export const SOUNDS: Record<string, SoundType> = {
  // Solfeggio Frequencies (using audio files from /public)
  '174 Hz (Grounding)': { type: 'file', path: '/174hz.mp3' },
  '285 Hz (Tissue Regeneration)': { type: 'file', path: '/285hz.mp3' },
  '396 Hz (Release Fear)': { type: 'file', path: '/396hz.mp3' },
  '417 Hz (Clear Negativity)': { type: 'file', path: '/417hz.mp3' },
  '528 Hz (Love/Miracle)': { type: 'file', path: '/528hz.mp3' },
  '639 Hz (Emotional Harmony)': { type: 'file', path: '/639hz.mp3' },
  '741 Hz (Detoxification)': { type: 'file', path: '/741hz.mp3' },
  '852 Hz (Third Eye)': { type: 'file', path: '/852hz.mp3' },
  '963 Hz (Crown Chakra)': { type: 'file', path: '/963hz.mp3' },
  
  // Noise Types - use audio files for better quality
  'Pink Noise': { type: 'file', path: '/pink-noise.mp3' },
  'Brown Noise': { type: 'file', path: '/brown-noise.mp3' },
  'White Noise': { type: 'file', path: '/white-noise.mp3' },
  'Green Noise': 'green', // Generated with Tone.js
  'Green Noise 2': 'green', // Generated with Tone.js (same as Green Noise)
  
  // Nature Sounds
  'Deschutes River': { type: 'file', path: '/deschutes-river.mp3' },
  'Lovejoy Fountain': { type: 'file', path: '/lovejoy-fountain.mp3' },
  'Multnomah Falls': { type: 'file', path: '/multnomah-falls.mp3' },
  'Spring Rain': { type: 'file', path: '/spring-rain.mp3' },
  'Tucson Stream': { type: 'file', path: '/tucson-stream.mp3' },
  'Wind Chimes': { type: 'file', path: '/wind-chimes.mp3' },
  'Cat Purr': { type: 'file', path: '/cat-purr.mp3' },
  'Wind': { type: 'file', path: '/wind.mp3' },
  'Bath Sound': 'bath', // Generated with Tone.js - water/bath ambience
  
  // Legacy frequencies (keeping for compatibility)
  'Healing (432 Hz)': 432,
  'Mental Clarity (825 Hz)': 825,
  'Alpha Waves': 12,
  'Theta Waves': 6,
};

interface ColorScheme {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  headerTextColor?: string;
}

export function SoundPlayer({ 
  onFrequencyChange, 
  sceneryIndex,
  colorScheme 
}: { 
  onFrequencyChange: (freq: number) => void;
  sceneryIndex: number;
  colorScheme: ColorScheme;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedSound, setSelectedSound] = useState<keyof typeof SOUNDS>('528 Hz (Love/Miracle)');
  const [oscillator, setOscillator] = useState<Tone.Oscillator | null>(null);
  const [noise, setNoise] = useState<Tone.Noise | null>(null);
  const [player, setPlayer] = useState<Tone.Player | null>(null);
  const oscillatorRef = useRef<Tone.Oscillator | null>(null);
  const noiseRef = useRef<Tone.Noise | null>(null);
  const playerRef = useRef<Tone.Player | null>(null);
  const [volume, setVolume] = useState(-12);
  const volumeControlRef = useRef<Tone.Volume | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolume = useRef(volume);
  const [timer, setTimer] = useState(0); // Timer in seconds (countdown)
  const [selectedTimerDuration, setSelectedTimerDuration] = useState<number | null>(null); // Selected duration in seconds
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Suppress unused variable warnings for state setters used for React updates
  void oscillator; void noise; void player; void timer;
  
  // Timer presets in minutes
  const TIMER_PRESETS = [
    { label: 'No Timer', value: null },
    { label: '5 minutes', value: 5 * 60 },
    { label: '10 minutes', value: 10 * 60 },
    { label: '15 minutes', value: 15 * 60 },
    { label: '20 minutes', value: 20 * 60 },
    { label: '30 minutes', value: 30 * 60 },
    { label: '45 minutes', value: 45 * 60 },
    { label: '60 minutes', value: 60 * 60 },
  ];

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && navigator.wakeLock) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake lock released');
        });
      } catch (err) {
        console.log('Wake lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake lock released manually');
      } catch (err) {
        console.log('Wake lock release failed:', err);
      }
    }
  }, []);

  useEffect(() => {
    // Initialize volume control
    volumeControlRef.current = new Tone.Volume(volume).toDestination();
    console.log('Volume control initialized', { volume });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isPlayingRef.current) {
        console.log('Page became visible, resuming audio context');
        try {
          await Tone.start();
          if (Tone.context.state !== 'running') {
            await Tone.context.resume();
          }
          requestWakeLock();
        } catch (err) {
          console.log('Failed to resume audio:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('Cleaning up audio nodes');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      volumeControlRef.current?.dispose();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Cleanup audio sources when component unmounts
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.dispose();
      }
      if (noiseRef.current) {
        noiseRef.current.stop();
        noiseRef.current.dispose();
      }
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (volumeControlRef.current) {
      const newVolume = isMuted ? -Infinity : volume;
      console.log('Updating volume', { newVolume, isMuted });
      volumeControlRef.current.volume.value = newVolume;
    }
  }, [volume, isMuted]);

  const toggleSound = async () => {
    console.log('Toggle sound clicked', { isPlaying, selectedSound });
    
    if (!isPlaying) {
      // Clean up any existing sounds first
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.dispose();
        oscillatorRef.current = null;
      }
      if (noiseRef.current) {
        noiseRef.current.stop();
        noiseRef.current.dispose();
        noiseRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
      setOscillator(null);
      setNoise(null);
      setPlayer(null);

      try {
        console.log('Starting Tone.js context');
        await Tone.start();
        await requestWakeLock();
      } catch (error) {
        console.error('Failed to start Tone.js:', error);
        return;
      }

      const soundDef = SOUNDS[selectedSound];
      
      if (!soundDef) {
        console.error('Sound definition not found:', selectedSound);
        return;
      }
      
      // Handle frequency-based sounds (numbers)
      if (typeof soundDef === 'number') {
        console.log('Creating oscillator...', { freq: soundDef });
        try {
          const osc = new Tone.Oscillator({
            frequency: soundDef,
            type: 'sine',
          });
          osc.connect(volumeControlRef.current!);
          setOscillator(osc);
          oscillatorRef.current = osc;
          osc.start();
          console.log('Oscillator started successfully');
          onFrequencyChange(soundDef);
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to create oscillator:', error);
          alert('Failed to play sound. Please try again.');
        }
      }
      // Handle noise types
      else if (typeof soundDef === 'string') {
        console.log('Creating noise...', { type: soundDef });
        try {
          let noiseGen: Tone.Noise;
          
          // Green noise is not directly supported, so we'll use pink noise filtered
          if (soundDef === 'green') {
            // Create pink noise and apply a filter to approximate green noise
            noiseGen = new Tone.Noise({
              type: 'pink',
            });
            // Apply a bandpass filter to emphasize mid-range frequencies (green noise characteristic)
            const filter = new Tone.Filter({
              frequency: 500,
              type: 'bandpass',
              Q: 2,
            });
            noiseGen.connect(filter);
            filter.connect(volumeControlRef.current!);
          } else if (soundDef === 'bath') {
            // Create bath/water sound using filtered brown noise (sounds like water)
            noiseGen = new Tone.Noise({
              type: 'brown',
            });
            // Apply a low-pass filter to create a warm, water-like sound
            const filter = new Tone.Filter({
              frequency: 800,
              type: 'lowpass',
              Q: 1,
            });
            noiseGen.connect(filter);
            filter.connect(volumeControlRef.current!);
          } else {
            noiseGen = new Tone.Noise({
              type: soundDef as 'pink' | 'brown' | 'white',
            });
            noiseGen.connect(volumeControlRef.current!);
          }
          setNoise(noiseGen);
          noiseRef.current = noiseGen;
          noiseGen.start();
          console.log('Noise started successfully');
          onFrequencyChange(432);
          setIsPlaying(true);
          isPlayingRef.current = true;
        } catch (error) {
          console.error('Failed to create noise:', error);
          alert('Failed to play sound. Please try again.');
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      }
      // Handle audio files
      else if (soundDef && typeof soundDef === 'object' && soundDef.type === 'file') {
        console.log('Loading audio file...', { path: soundDef.path });
        setIsLoading(true);
        setLoadingProgress(0);
        
        try {
          // Show loading progress
          setLoadingProgress(10);
          
          // Create player - Tone.Player will handle loading
          const audioPlayer = new Tone.Player({
            url: soundDef.path,
            loop: true,
            autostart: false,
          });
          
          // Connect through volume control
          audioPlayer.connect(volumeControlRef.current!);
          
          setPlayer(audioPlayer);
          playerRef.current = audioPlayer;
          
          setLoadingProgress(30);
          
          // Load the buffer - this is the slow part for large files
          // Load the buffer - pass the URL to load() with error handling
          try {
            await audioPlayer.load(soundDef.path);
          } catch (loadError) {
            console.error('Tone.Player.load() error:', loadError);
            const errorMsg = loadError instanceof Error ? loadError.message : String(loadError);
            if (errorMsg.includes('decode') || errorMsg.includes('DecodeError') || errorMsg.includes('Unable to decode')) {
              throw new Error(`Unable to decode audio file: ${soundDef.path}. The file may be corrupted, in an unsupported format, or not a valid MP3 file.`);
            }
            throw loadError;
          }
          
          // Wait for buffer to be fully ready with retry logic
          let attempts = 0;
          while ((!audioPlayer.buffer || !audioPlayer.buffer.loaded) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            const progress = Math.min(90, 30 + (attempts * 1.2));
            setLoadingProgress(progress);
          }
          
          setLoadingProgress(90);
          
          // Verify the buffer loaded - give it one more chance
          if (!audioPlayer.buffer || !audioPlayer.buffer.loaded) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!audioPlayer.buffer || !audioPlayer.buffer.loaded) {
              throw new Error(`Buffer did not load successfully for ${soundDef.path}. File may not exist (404) or is corrupted.`);
            }
          }
          
          // Verify buffer has valid duration
          if (audioPlayer.buffer.duration === 0 || isNaN(audioPlayer.buffer.duration)) {
            throw new Error(`Audio file ${soundDef.path} has invalid duration. File may be corrupted or empty.`);
          }
          
          setLoadingProgress(100);
          
          // Start playback
          audioPlayer.start();
          console.log('Audio file started successfully', { 
            duration: audioPlayer.buffer.duration,
            sampleRate: audioPlayer.buffer.sampleRate 
          });
          onFrequencyChange(528); // Default frequency for visualization
          setIsPlaying(true);
          isPlayingRef.current = true;
          setIsLoading(false);
          setLoadingProgress(0);
        } catch (error) {
          console.error('Failed to create/load audio player:', error);
          
          // Safely extract error message
          let errorMessage = 'Unknown error';
          try {
            if (error && typeof error === 'object') {
              if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
              } else if ('toString' in error && typeof error.toString === 'function') {
                errorMessage = error.toString();
              }
            } else if (error) {
              errorMessage = String(error);
            }
          } catch (e) {
            console.error('Error extracting error message:', e);
            errorMessage = 'Failed to load audio file';
          }
          
          console.error('Full error details:', error, { path: soundDef.path });
          setIsPlaying(false);
          isPlayingRef.current = false;
          setIsLoading(false);
          setLoadingProgress(0);
          setPlayer(null);
          if (playerRef.current) {
            try {
              playerRef.current.dispose();
            } catch (e) {
              console.error('Error disposing player:', e);
            }
            playerRef.current = null;
          }
          // Show user-friendly error without accessing undefined properties
          console.warn(`Could not load audio file: ${soundDef.path}. Error: ${errorMessage}`);
          // Don't show alert for every error to avoid spam
        }
      }
      
      // Start timer only if sound is playing
      if (isPlayingRef.current) {
        if (selectedTimerDuration !== null) {
          setTimer(selectedTimerDuration);
          timerIntervalRef.current = setInterval(() => {
            setTimer((prev) => {
              if (prev <= 1) {
                // Timer reached zero - stop the sound
                if (timerIntervalRef.current) {
                  clearInterval(timerIntervalRef.current);
                  timerIntervalRef.current = null;
                }
                // Stop the sound using refs
                if (oscillatorRef.current) {
                  oscillatorRef.current.stop();
                  oscillatorRef.current.dispose();
                  oscillatorRef.current = null;
                }
                if (noiseRef.current) {
                  noiseRef.current.stop();
                  noiseRef.current.dispose();
                  noiseRef.current = null;
                }
                if (playerRef.current) {
                  playerRef.current.stop();
                  playerRef.current.dispose();
                  playerRef.current = null;
                }
                setOscillator(null);
                setNoise(null);
                setPlayer(null);
                setIsPlaying(false);
                isPlayingRef.current = false;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // Count up timer
          setTimer(0);
          timerIntervalRef.current = setInterval(() => {
            setTimer((prev) => prev + 1);
          }, 1000);
        }
      }
    } else {
      isPlayingRef.current = false;
      console.log('Stopping sound...');
      if (oscillatorRef.current) {
        console.log('Disposing oscillator');
        oscillatorRef.current.stop();
        oscillatorRef.current.dispose();
        oscillatorRef.current = null;
      }
      if (noiseRef.current) {
        console.log('Disposing noise');
        noiseRef.current.stop();
        noiseRef.current.dispose();
        noiseRef.current = null;
      }
      if (playerRef.current) {
        console.log('Disposing player');
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
      setOscillator(null);
      setNoise(null);
      setPlayer(null);
      console.log('Sound stopped and cleaned up');
      
      releaseWakeLock();
      
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSoundChange = (value: keyof typeof SOUNDS) => {
    if (isPlaying) {
      console.log('Cleaning up previous sound before change');
      if (oscillatorRef.current) {
        oscillatorRef.current.stop().dispose();
        oscillatorRef.current = null;
      }
      if (noiseRef.current) {
        noiseRef.current.stop().dispose();
        noiseRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.stop().dispose();
        playerRef.current = null;
      }
      setOscillator(null);
      setNoise(null);
      setPlayer(null);
      setIsPlaying(false);
      isPlayingRef.current = false;
      // Reset timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimer(selectedTimerDuration || 0);
    }
    console.log('Changing sound to:', value);
    setSelectedSound(value);
  };
  
  const handleTimerChange = (value: string) => {
    const duration = value === 'null' ? null : parseInt(value);
    setSelectedTimerDuration(duration);
    // Reset timer to new duration if not playing
    if (!isPlaying) {
      setTimer(duration || 0);
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume.current);
    } else {
      previousVolume.current = volume;
    }
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className="relative backdrop-blur-xl shadow-2xl w-full max-w-6xl border glassmorphic transition-all duration-3000 p-8"
      style={{
        backgroundColor: `${colorScheme.primaryColor}15`,
        borderColor: `${colorScheme.primaryColor}40`,
        borderRadius: '10px'
      }}
    >
      {/* Gloss effect overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-br pointer-events-none transition-opacity duration-3000"
        style={{
          background: `linear-gradient(135deg, ${colorScheme.primaryColor}30, transparent, transparent)`,
          borderRadius: '10px'
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6 gap-6">
          <h2 
            className="text-4xl font-semibold drop-shadow-lg transition-colors duration-3000 flex-shrink-0"
            style={{ color: colorScheme.textColor }}
          >
            Sound Therapy
          </h2>
          <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={toggleMute}
              className="hover:opacity-80 transition-all duration-3000 backdrop-blur-sm p-3 border"
              style={{
                color: colorScheme.textColor,
                backgroundColor: `${colorScheme.primaryColor}1A`,
                borderColor: `${colorScheme.primaryColor}4D`,
                borderRadius: '8px'
              }}
        >
          {isMuted ? (
                <VolumeX className="w-6 h-6" />
          ) : (
                <Volume2 className="w-6 h-6" />
          )}
        </button>
          </div>
      </div>
      
        <div className="space-y-6">
        <select
          value={selectedSound}
            onChange={(e) => handleSoundChange(e.target.value as keyof typeof SOUNDS)}
            className="w-full p-4 text-xl border-2 backdrop-blur-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 transition-all duration-3000"
            style={{
              borderRadius: '8px',
              backgroundColor: `${colorScheme.primaryColor}1A`,
              borderColor: `${colorScheme.primaryColor}4D`,
              '--tw-ring-color': colorScheme.primaryColor
            } as React.CSSProperties}
        >
            {Object.keys(SOUNDS).map((sound) => (
              <option key={sound} value={sound} style={{ backgroundColor: colorScheme.primaryColor, color: 'white' }}>
              {sound}
            </option>
          ))}
        </select>

          {/* Timer dropdown */}
          <div className="space-y-2">
            <label 
              className="text-lg font-medium transition-colors duration-3000"
              style={{ color: colorScheme.textColor }}
            >
              Timer Duration
            </label>
            <select
              value={selectedTimerDuration === null ? 'null' : selectedTimerDuration.toString()}
              onChange={(e) => handleTimerChange(e.target.value)}
              disabled={isPlaying}
              className="w-full p-4 text-xl border-2 backdrop-blur-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 transition-all duration-3000 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderRadius: '8px',
                backgroundColor: `${colorScheme.primaryColor}1A`,
                borderColor: `${colorScheme.primaryColor}4D`,
                '--tw-ring-color': colorScheme.primaryColor
              } as React.CSSProperties}
            >
              {TIMER_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.value === null ? 'null' : preset.value.toString()} style={{ backgroundColor: colorScheme.primaryColor, color: 'white' }}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

        <button
          onClick={toggleSound}
            disabled={isLoading}
            className="w-full py-6 px-8 text-2xl text-white 
                     transition-all duration-3000 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl border backdrop-blur-sm hover:opacity-90 disabled:opacity-70 disabled:cursor-wait relative overflow-hidden"
            style={{
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${colorScheme.primaryColor}E6, ${colorScheme.secondaryColor}E6)`,
              borderColor: `${colorScheme.primaryColor}40`
            }}
          >
            {isLoading && (
              <div 
                className="absolute inset-0 bg-white/20 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            )}
            {isLoading ? (
              <span className="relative z-10">Loading... {Math.round(loadingProgress)}%</span>
            ) : isPlaying ? (
            <>
              <Pause className="w-8 h-8" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-8 h-8" />
              <span>Play</span>
            </>
          )}
        </button>

          <div className="space-y-3">
            <div className="flex items-center justify-between transition-colors duration-3000" style={{ color: colorScheme.textColor }}>
              <span className="text-lg font-medium">Volume</span>
              <span className="text-sm font-mono">{isMuted ? 'Muted' : `${Math.round(((volume + 40) / 40) * 100)}%`}</span>
            </div>
        <div className="flex items-center space-x-4">
              <VolumeX className="w-5 h-5 transition-colors duration-3000" style={{ color: `${colorScheme.textColor}B3` }} />
          <input
            type="range"
            min="-40"
            max="0"
                value={volume}
            onChange={handleVolumeChange}
                className="flex-1 h-3 rounded-full appearance-none cursor-pointer transition-all duration-3000 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${colorScheme.primaryColor}99 0%, ${colorScheme.primaryColor}99 ${((volume + 40) / 40) * 100}%, rgba(255, 255, 255, 0.2) ${((volume + 40) / 40) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                }}
          />
              <Volume2 className="w-5 h-5 transition-colors duration-3000" style={{ color: `${colorScheme.textColor}B3` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}