import React from 'react';
import { useState } from 'react';
import { SoundPlayer } from './components/SoundPlayer';
import { Brain } from 'lucide-react';

function App() {
  const [currentFrequency, setCurrentFrequency] = useState(432);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient animate-gradient">
      
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <Brain className="w-24 h-24 text-purple-400" />
          </div>
          <h1 className="text-6xl font-bold text-purple-400 mb-4 drop-shadow-glow">AuDHD Sound Therapy</h1>
          <p className="text-purple-300 text-xl">Find your calm with therapeutic frequencies and soothing visualizations</p>
        </div>

        <div className="flex justify-center">
          <SoundPlayer onFrequencyChange={setCurrentFrequency} />
        </div>
      </div>
    </div>
  );
}

export default App;
