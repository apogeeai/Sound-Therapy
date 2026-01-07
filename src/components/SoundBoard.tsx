import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { SOUNDS, type SoundType } from './SoundPlayer';

interface SoundSlot {
  id: number;
  soundName: string | null;
  soundDef: SoundType | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  oscillator: Tone.Oscillator | null;
  noise: Tone.Noise | null;
  player: Tone.Player | null;
  filter: Tone.Filter | null;
}

interface ColorScheme {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  headerTextColor?: string;
}

export function SoundBoard({ colorScheme }: { colorScheme: ColorScheme }) {
  const [slots, setSlots] = useState<SoundSlot[]>([
    { id: 1, soundName: null, soundDef: null, isPlaying: false, isLoading: false, volume: -12, isMuted: false, oscillator: null, noise: null, player: null, filter: null },
    { id: 2, soundName: null, soundDef: null, isPlaying: false, isLoading: false, volume: -12, isMuted: false, oscillator: null, noise: null, player: null, filter: null },
    { id: 3, soundName: null, soundDef: null, isPlaying: false, isLoading: false, volume: -12, isMuted: false, oscillator: null, noise: null, player: null, filter: null },
    { id: 4, soundName: null, soundDef: null, isPlaying: false, isLoading: false, volume: -12, isMuted: false, oscillator: null, noise: null, player: null, filter: null },
  ]);

  const volumeControlsRef = useRef<(Tone.Volume | null)[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const faderRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Initialize volume controls for each slot
    volumeControlsRef.current = slots.map(() => new Tone.Volume(-12).toDestination());
    
    return () => {
      // Cleanup all audio sources
      slots.forEach((slot) => {
        slot.oscillator?.stop().dispose();
        slot.noise?.stop().dispose();
        slot.player?.stop().dispose();
        slot.filter?.dispose();
      });
      volumeControlsRef.current.forEach(vol => vol?.dispose());
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && navigator.wakeLock) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log('Wake lock request failed:', err);
      }
    }
  }, []);

  const loadSound = async (slotId: number, soundName: string, soundDef: SoundType) => {
    const slotIndex = slotId - 1;
    const volumeControl = volumeControlsRef.current[slotIndex];
    if (!volumeControl) return;

    // Stop any existing sound in this slot
    setSlots(prev => {
      const slot = prev[slotIndex];
      if (slot.oscillator) {
        slot.oscillator.stop().dispose();
      }
      if (slot.noise) {
        slot.noise.stop().dispose();
      }
      if (slot.player) {
        slot.player.stop().dispose();
      }
      if (slot.filter) {
        slot.filter.dispose();
      }
      return prev.map(s => s.id === slotId ? { ...s, isLoading: true, soundName, soundDef, isPlaying: false } : s);
    });

    try {
      await Tone.start();
      await requestWakeLock();

      // Handle frequency-based sounds
      if (typeof soundDef === 'number') {
        const osc = new Tone.Oscillator({
          frequency: soundDef,
          type: 'sine',
        });
        osc.connect(volumeControl);
        setSlots(prev => prev.map(s => 
          s.id === slotId ? { ...s, oscillator: osc, isLoading: false, isPlaying: true } : s
        ));
        osc.start();
      }
      // Handle noise types
      else if (typeof soundDef === 'string') {
        let noiseGen: Tone.Noise;
        let filter: Tone.Filter | null = null;

        if (soundDef === 'green') {
          noiseGen = new Tone.Noise({ type: 'pink' });
          filter = new Tone.Filter({
            frequency: 500,
            type: 'bandpass',
            Q: 2,
          });
          noiseGen.connect(filter);
          filter.connect(volumeControl);
        } else if (soundDef === 'bath') {
          // Create bath/water sound using filtered brown noise
          noiseGen = new Tone.Noise({ type: 'brown' });
          filter = new Tone.Filter({
            frequency: 800,
            type: 'lowpass',
            Q: 1,
          });
          noiseGen.connect(filter);
          filter.connect(volumeControl);
        } else {
          noiseGen = new Tone.Noise({
            type: soundDef as 'pink' | 'brown' | 'white',
          });
          noiseGen.connect(volumeControl);
        }

        setSlots(prev => prev.map(s => 
          s.id === slotId ? { ...s, noise: noiseGen, filter, isLoading: false, isPlaying: true } : s
        ));
        noiseGen.start();
      }
      // Handle audio files
      else if (soundDef && typeof soundDef === 'object' && soundDef.type === 'file') {
        try {
          const audioPlayer = new Tone.Player({
            url: soundDef.path,
            loop: true,
            autostart: false,
          });
          audioPlayer.connect(volumeControl);
          
          setSlots(prev => prev.map(s => 
            s.id === slotId ? { ...s, player: audioPlayer } : s
          ));
          
          // Load with error handling
          try {
            await audioPlayer.load(soundDef.path);
          } catch (loadError) {
            console.error('Tone.Player.load() error:', loadError);
            // Check if it's a decode error
            const errorMsg = loadError instanceof Error ? loadError.message : String(loadError);
            if (errorMsg.includes('decode') || errorMsg.includes('DecodeError') || errorMsg.includes('Unable to decode')) {
              throw new Error(`Unable to decode audio file: ${soundDef.path}. The file may be corrupted, in an unsupported format, or not a valid MP3 file.`);
            }
            throw loadError;
          }
          
          // Wait for buffer to be fully ready with retry logic
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds
          while ((!audioPlayer.buffer || !audioPlayer.buffer.loaded) && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          // Final wait to ensure buffer is ready
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (!audioPlayer.buffer || !audioPlayer.buffer.loaded) {
            throw new Error(`Buffer did not load successfully for ${soundDef.path}. File may not exist (404) or is corrupted.`);
          }

          // Verify buffer has audio data
          if (audioPlayer.buffer.duration === 0 || isNaN(audioPlayer.buffer.duration)) {
            throw new Error(`Audio file ${soundDef.path} has invalid duration. File may be corrupted or empty.`);
          }

          setSlots(prev => prev.map(s => 
            s.id === slotId ? { ...s, player: audioPlayer, isLoading: false, isPlaying: true } : s
          ));
          audioPlayer.start();
        } catch (playerError) {
          // Re-throw with more context
          const errorMsg = playerError instanceof Error ? playerError.message : String(playerError);
          if (errorMsg.includes('decode') || errorMsg.includes('DecodeError')) {
            throw new Error(`Unable to decode: ${soundDef.path}. Please ensure the file is a valid MP3 audio file.`);
          }
          throw playerError;
        }
      }
    } catch (error) {
      console.error(`Failed to load sound in slot ${slotId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Full error details:', error, { soundName, soundDef });
      
      const filePath = typeof soundDef === 'object' && soundDef.type === 'file' ? soundDef.path : 'N/A';
      
      // Clear the failed sound
      setSlots(prev => prev.map(s => 
        s.id === slotId ? { 
          ...s, 
          isLoading: false, 
          isPlaying: false,
          soundName: null,
          soundDef: null,
          player: null,
        } : s
      ));
      
      // Show alert with helpful message
      alert(`❌ Could not load: ${soundName}\n\nFile path: ${filePath}\n\nError: ${errorMessage}\n\nPlease ensure the file exists in the /public folder and is a valid MP3 file.`);
    }
  };

  const toggleSlot = (slotId: number) => {
    setSlots(prev => {
      const slotIndex = slotId - 1;
      const slot = prev[slotIndex];
      
      if (!slot.soundDef) return prev;

      if (slot.isPlaying) {
        // Stop
        slot.oscillator?.stop();
        slot.noise?.stop();
        slot.player?.stop();
        return prev.map(s => 
          s.id === slotId ? { ...s, isPlaying: false } : s
        );
      } else {
        // Start
        slot.oscillator?.start();
        slot.noise?.start();
        slot.player?.start();
        return prev.map(s => 
          s.id === slotId ? { ...s, isPlaying: true } : s
        );
      }
    });
  };

  const removeSound = (slotId: number) => {
    setSlots(prev => {
      const slotIndex = slotId - 1;
      const slot = prev[slotIndex];
      
      slot.oscillator?.stop().dispose();
      slot.noise?.stop().dispose();
      slot.player?.stop().dispose();
      slot.filter?.dispose();
      
      return prev.map(s => 
        s.id === slotId ? { 
          ...s, 
          soundName: null, 
          soundDef: null, 
          isPlaying: false, 
          oscillator: null, 
          noise: null, 
          player: null, 
          filter: null 
        } : s
      );
    });
  };

  const updateVolume = (slotId: number, newVolume: number) => {
    const slotIndex = slotId - 1;
    const volumeControl = volumeControlsRef.current[slotIndex];
    if (volumeControl) {
      volumeControl.volume.value = newVolume;
    }
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, volume: newVolume, isMuted: false } : s
    ));
  };

  const toggleMute = (slotId: number) => {
    setSlots(prev => {
      const slotIndex = slotId - 1;
      const slot = prev[slotIndex];
      const volumeControl = volumeControlsRef.current[slotIndex];
      
      if (volumeControl) {
        if (slot.isMuted) {
          volumeControl.volume.value = slot.volume;
        } else {
          volumeControl.volume.value = -Infinity;
        }
      }
      
      return prev.map(s => 
        s.id === slotId ? { ...s, isMuted: !s.isMuted } : s
      );
    });
  };

  // Handle vertical fader drag
  const handleFaderMouseDown = (slotId: number, e: React.MouseEvent) => {
    e.preventDefault();
    const faderElement = faderRefs.current[slotId - 1];
    if (!faderElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = faderElement.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const percentage = Math.max(0, Math.min(1, 1 - (y / height)));
      const newVolume = -40 + (percentage * 40); // -40dB to 0dB
      updateVolume(slotId, newVolume);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    handleMouseMove(e.nativeEvent);
  };

  const formatVolume = (volume: number) => {
    if (volume === -Infinity) return '-∞';
    return volume.toFixed(1);
  };

  const getVolumePercentage = (volume: number) => {
    return ((volume + 40) / 40) * 100;
  };

  return (
    <div 
      className="relative backdrop-blur-xl shadow-2xl w-full max-w-7xl border glassmorphic transition-all duration-3000 p-6"
      style={{
        backgroundColor: `${colorScheme.primaryColor}20`,
        borderColor: `${colorScheme.primaryColor}50`,
        borderRadius: '10px'
      }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-br pointer-events-none transition-opacity duration-3000"
        style={{
          background: `linear-gradient(135deg, ${colorScheme.primaryColor}25, transparent, transparent)`,
          borderRadius: '10px'
        }}
      />
      
      <div className="relative z-10">
        <h2 
          className="text-3xl font-bold drop-shadow-lg transition-colors duration-3000 mb-6 text-center"
          style={{ color: colorScheme.textColor }}
        >
          DAW Mixer
        </h2>

        {/* Mixer Channel Strips */}
        <div className="flex gap-4 justify-center flex-wrap">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-col items-center backdrop-blur-md border transition-all duration-3000"
              style={{
                backgroundColor: `${colorScheme.primaryColor}15`,
                borderColor: `${colorScheme.primaryColor}40`,
                borderRadius: '8px',
                padding: '16px',
                minWidth: '160px',
                width: '160px'
              }}
            >
              {/* Track Label */}
              <div className="w-full mb-3">
                <select
                  value={slot.soundName || ''}
                  onChange={(e) => {
                    const soundName = e.target.value;
                    if (soundName && SOUNDS[soundName]) {
                      loadSound(slot.id, soundName, SOUNDS[soundName]);
                    } else if (!soundName) {
                      removeSound(slot.id);
                    }
                  }}
                  disabled={slot.isLoading}
                  className="w-full p-2 text-xs border backdrop-blur-sm text-white focus:outline-none focus:ring-1 transition-all duration-3000 disabled:opacity-50 overflow-visible"
                  style={{
                    borderRadius: '6px',
                    backgroundColor: `${colorScheme.primaryColor}30`,
                    borderColor: `${colorScheme.primaryColor}60`,
                  }}
                >
                  <option value="">Track {slot.id}</option>
                  {Object.keys(SOUNDS).map((sound) => (
                    <option key={sound} value={sound} style={{ backgroundColor: colorScheme.primaryColor, color: 'white' }}>
                      {sound}
                    </option>
                  ))}
                </select>
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={() => toggleSlot(slot.id)}
                disabled={!slot.soundDef || slot.isLoading}
                className="w-10 h-10 rounded-full mb-3 transition-all duration-3000 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  backgroundColor: slot.isPlaying 
                    ? `${colorScheme.secondaryColor}CC` 
                    : `${colorScheme.primaryColor}80`,
                  color: '#ffffff'
                }}
              >
                {slot.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : slot.isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* Vertical Fader */}
              <div className="flex-1 flex flex-col items-center w-full mb-3">
                <div 
                  ref={(el) => { faderRefs.current[slot.id - 1] = el; }}
                  className="relative w-12 h-48 bg-black/40 rounded-lg cursor-pointer border-2 mb-2"
                  style={{ borderColor: `${colorScheme.primaryColor}60` }}
                  onMouseDown={(e) => handleFaderMouseDown(slot.id, e)}
                >
                  {/* Fader Track */}
                  <div className="absolute inset-0 flex flex-col justify-between p-1">
                    {/* Volume Fill */}
                    <div 
                      className="w-full rounded transition-all duration-150"
                      style={{
                        backgroundColor: slot.isMuted 
                          ? '#666' 
                          : `${colorScheme.primaryColor}CC`,
                        height: `${getVolumePercentage(slot.volume)}%`,
                        marginTop: 'auto'
                      }}
                    />
                  </div>
                  
                  {/* Fader Handle */}
                  <div
                    className="absolute w-full h-4 bg-white/90 rounded border-2 pointer-events-none transition-all duration-150"
                    style={{
                      borderColor: colorScheme.primaryColor,
                      bottom: `${getVolumePercentage(slot.volume)}%`,
                      transform: 'translateY(50%)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  />
                </div>

                {/* Volume Display */}
                <div 
                  className="text-xs font-mono font-semibold"
                  style={{ color: slot.isMuted ? '#999' : colorScheme.textColor }}
                >
                  {slot.isMuted ? 'MUTE' : `${formatVolume(slot.volume)} dB`}
                </div>
              </div>

              {/* Mute Button */}
              <button
                onClick={() => toggleMute(slot.id)}
                disabled={!slot.soundDef}
                className="w-full py-2 rounded transition-all duration-3000 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
                style={{
                  backgroundColor: slot.isMuted 
                    ? '#ef4444' 
                    : `${colorScheme.primaryColor}40`,
                  color: slot.isMuted ? '#ffffff' : colorScheme.textColor,
                  borderRadius: '6px'
                }}
              >
                {slot.isMuted ? (
                  <span className="flex items-center justify-center gap-1">
                    <VolumeX className="w-4 h-4" />
                    MUTED
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Volume2 className="w-4 h-4" />
                    MUTE
                  </span>
                )}
              </button>

              {/* Remove Button */}
              {slot.soundName && (
                <button
                  onClick={() => removeSound(slot.id)}
                  className="mt-2 text-red-400 hover:text-red-300 transition-colors"
                  title="Remove sound"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Master Section */}
        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: `${colorScheme.primaryColor}40` }}>
          <div 
            className="text-sm font-semibold"
            style={{ color: colorScheme.textColor }}
          >
            Master Output - All tracks mixed
          </div>
        </div>
      </div>
    </div>
  );
}
