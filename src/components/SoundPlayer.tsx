import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const FREQUENCIES = {
  'Healing (432 Hz)': 432,
  'DNA Repair (528 Hz)': 528,
  'Mental Clarity (825 Hz)': 825,
  'Fear Release (396 Hz)': 396,
  'Alpha Waves': 12,
  'Theta Waves': 6,
  'Pink Noise': 'pink',
  'Brown Noise': 'brown'
} as const;

export function SoundPlayer({ onFrequencyChange }: { onFrequencyChange: (freq: number) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<keyof typeof FREQUENCIES>('Healing (432 Hz)');
  const [oscillator, setOscillator] = useState<Tone.Oscillator | null>(null);
  const [noise, setNoise] = useState<Tone.Noise | null>(null);
  const [volume, setVolume] = useState(-12);
  const volumeControlRef = useRef<Tone.Volume | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolume = useRef(volume);

  useEffect(() => {
    // Initialize volume control
    volumeControlRef.current = new Tone.Volume(volume).toDestination();
    console.log('Volume control initialized', { volume });
    
    return () => {
      console.log('Cleaning up audio nodes');
      oscillator?.dispose();
      noise?.dispose();
      volumeControlRef.current?.dispose();
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
      try {
        console.log('Starting Tone.js context');
        await Tone.start();
      } catch (error) {
        console.error('Failed to start Tone.js:', error);
        return;
      }

      const freq = FREQUENCIES[selectedSound];
      
      if (typeof freq === 'number') {
        console.log('Creating oscillator...', { freq });
        try {
          const osc = new Tone.Oscillator({
            frequency: freq,
            type: 'sine',
          }).connect(volumeControlRef.current!);
          setOscillator(osc);
          osc.start();
          console.log('Oscillator started successfully');
          onFrequencyChange(freq);
        } catch (error) {
          console.error('Failed to create oscillator:', error);
        }
      } else {
        console.log('Creating noise...', { type: freq });
        try {
          const noiseGen = new Tone.Noise({
            type: freq,
          }).connect(volumeControlRef.current!);
          setNoise(noiseGen);
          noiseGen.start();
          console.log('Noise started successfully');
          onFrequencyChange(432);
        } catch (error) {
          console.error('Failed to create noise:', error);
        }
      }
    } else {
      console.log('Stopping sound...');
      if (oscillator) {
        console.log('Disposing oscillator');
        oscillator.stop();
        oscillator.dispose();
      }
      if (noise) {
        console.log('Disposing noise');
        noise.stop();
        noise.dispose();
      }
      setOscillator(null);
      setNoise(null);
      console.log('Sound stopped and cleaned up');
    }
    setIsPlaying(!isPlaying);
  };

  const handleSoundChange = (value: keyof typeof FREQUENCIES) => {
    if (isPlaying) {
      console.log('Cleaning up previous sound before change');
      oscillator?.stop().dispose();
      noise?.stop().dispose();
      setOscillator(null);
      setNoise(null);
      setIsPlaying(false);
    }
    console.log('Changing sound to:', value);
    setSelectedSound(value);
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
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl w-full max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-4xl font-semibold text-purple-900">Sound Therapy</h2>
        <button
          onClick={toggleMute}
          className="text-purple-700 hover:text-purple-900 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-12 h-12" />
          ) : (
            <Volume2 className="w-12 h-12" />
          )}
        </button>
      </div>
      
      <div className="space-y-8">
        <select
          value={selectedSound}
          onChange={(e) => handleSoundChange(e.target.value as keyof typeof FREQUENCIES)}
          className="w-full p-4 text-xl rounded-xl border-2 border-purple-200 bg-white text-purple-900"
        >
          {Object.keys(FREQUENCIES).map((sound) => (
            <option key={sound} value={sound}>
              {sound}
            </option>
          ))}
        </select>

        <button
          onClick={toggleSound}
          className="w-full py-6 px-8 text-2xl bg-purple-600 text-white rounded-xl hover:bg-purple-700 
                   transition-colors flex items-center justify-center space-x-2"
        >
          {isPlaying ? (
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

        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="-40"
            max="0"
            value={isMuted ? -40 : volume}
            onChange={handleVolumeChange}
            className="w-full h-4 bg-purple-200 rounded-full appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>
    </div>
  );
}