import { useState, useEffect } from 'react';
import { SoundPlayer } from './components/SoundPlayer';
import { SoundBoard } from './components/SoundBoard';
import { Brain, Image, Music } from 'lucide-react';

// Relaxing scenery backgrounds - using Unsplash images with color-matched overlays
const SCENERIES = [
  {
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    overlay: 'rgba(59, 130, 246, 0.25)', // Sky blue overlay
    primaryColor: '#3b82f6', // Sky blue
    secondaryColor: '#60a5fa', // Lighter sky blue
    textColor: '#dbeafe', // Light blue text
    accentColor: '#93c5fd' // Accent blue
  },
  {
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
    overlay: 'rgba(34, 197, 94, 0.25)', // Forest green overlay
    primaryColor: '#22c55e', // Forest green
    secondaryColor: '#4ade80', // Lighter green
    textColor: '#dcfce7', // Light green text
    accentColor: '#86efac', // Accent green
    headerTextColor: '#ffffff' // White for header
  },
  {
    image: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80',
    overlay: 'rgba(96, 165, 250, 0.25)', // Lake blue overlay
    primaryColor: '#60a5fa', // Lake blue
    secondaryColor: '#93c5fd', // Lighter blue
    textColor: '#dbeafe', // Light blue text
    accentColor: '#bfdbfe' // Accent blue
  },
  {
    image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80',
    overlay: 'rgba(37, 99, 235, 0.25)', // Ocean blue overlay
    primaryColor: '#2563eb', // Ocean blue
    secondaryColor: '#3b82f6', // Lighter blue
    textColor: '#dbeafe', // Light blue text
    accentColor: '#93c5fd' // Accent blue
  },
  {
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
    overlay: 'rgba(79, 70, 229, 0.25)', // Mountain purple-blue overlay
    primaryColor: '#4f46e5', // Indigo
    secondaryColor: '#6366f1', // Lighter indigo
    textColor: '#e0e7ff', // Light indigo text
    accentColor: '#a5b4fc', // Accent indigo
    headerTextColor: '#ffffff' // White for header
  },
];

function App() {
  const [, setCurrentFrequency] = useState(432);
  const [currentScenery, setCurrentScenery] = useState(0);
  const [viewMode, setViewMode] = useState<'player' | 'board'>('player');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScenery((prev) => (prev + 1) % SCENERIES.length);
    }, 120000); // Change scenery every 2 minutes

    return () => clearInterval(interval);
  }, []);

  const handleBackgroundChange = () => {
    setCurrentScenery((prev) => (prev + 1) % SCENERIES.length);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient animate-gradient z-0" />
      
      {/* Changing scenery overlay */}
      <div 
        key={currentScenery}
        className="absolute inset-0 transition-opacity duration-3000 ease-in-out z-[1] bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${SCENERIES[currentScenery].image})`,
          opacity: 1
        }}
      >
        {/* Semi-transparent overlay for calming effect */}
        <div 
          className="absolute inset-0 transition-opacity duration-3000 ease-in-out"
          style={{
            backgroundColor: SCENERIES[currentScenery].overlay
          }}
        />
      </div>
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <Brain 
              className="w-24 h-24 drop-shadow-glow transition-colors duration-3000" 
              style={{ color: '#ffffff' }}
            />
          </div>
          <h1 
            className="text-6xl font-bold mb-4 drop-shadow-glow transition-colors duration-3000"
            style={{ color: '#ffffff' }}
          >
            Sound Therapy
          </h1>
          <p 
            className="text-xl drop-shadow-lg transition-colors duration-3000"
            style={{ color: SCENERIES[currentScenery].textColor }}
          >
            Find your calm with therapeutic frequencies and soothing visualizations
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          {/* Mode Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('player')}
              className="px-6 py-3 rounded-lg transition-all duration-3000 backdrop-blur-sm border"
              style={{
                backgroundColor: viewMode === 'player' 
                  ? `${SCENERIES[currentScenery].primaryColor}CC` 
                  : `${SCENERIES[currentScenery].primaryColor}30`,
                borderColor: `${SCENERIES[currentScenery].primaryColor}4D`,
                color: '#ffffff',
                borderRadius: '8px'
              }}
            >
              Single Sound
            </button>
            <button
              onClick={() => setViewMode('board')}
              className="px-6 py-3 rounded-lg transition-all duration-3000 backdrop-blur-sm border"
              style={{
                backgroundColor: viewMode === 'board' 
                  ? `${SCENERIES[currentScenery].primaryColor}CC` 
                  : `${SCENERIES[currentScenery].primaryColor}30`,
                borderColor: `${SCENERIES[currentScenery].primaryColor}4D`,
                color: '#ffffff',
                borderRadius: '8px'
              }}
            >
              <Music className="w-5 h-5 inline mr-2" />
              Sound Board
            </button>
          </div>

          {/* Content */}
          {viewMode === 'player' ? (
            <SoundPlayer 
              onFrequencyChange={setCurrentFrequency} 
              sceneryIndex={currentScenery}
              colorScheme={SCENERIES[currentScenery]}
            />
          ) : (
            <SoundBoard colorScheme={SCENERIES[currentScenery]} />
          )}
        </div>
      </div>

      {/* Background changer button */}
      <button
        onClick={handleBackgroundChange}
        className="fixed bottom-6 right-6 z-20 backdrop-blur-sm border transition-all duration-3000 hover:scale-110 hover:opacity-90 shadow-lg"
        style={{
          backgroundColor: `${SCENERIES[currentScenery].primaryColor}1A`,
          borderColor: `${SCENERIES[currentScenery].primaryColor}4D`,
          borderRadius: '10px',
          padding: '12px',
          color: SCENERIES[currentScenery].textColor
        }}
        aria-label="Change background"
      >
        <Image className="w-6 h-6" />
      </button>
    </div>
  );
}

export default App;
