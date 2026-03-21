'use client';

import { useState } from 'react';

interface TripFormProps {
  onSubmit: (origin: string, destination: string, distance: number, persona: string) => void;
  loading: boolean;
}

export default function TripForm({ onSubmit, loading }: TripFormProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('Alderman Library, UVA');
  const [distance, setDistance] = useState('2');
  const [persona, setPersona] = useState('student');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && destination && distance) {
      onSubmit(origin, destination, parseFloat(distance), persona);
    }
  };

  const personaDefaults = {
    student: 'Alderman Library, UVA',
    health: 'UVA Health Main Hospital',
    faculty: 'Scott Stadium parking',
  };

  const handlePersonaChange = (newPersona: string) => {
    setPersona(newPersona);
    setDestination(personaDefaults[newPersona as keyof typeof personaDefaults]);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Your Trip</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Persona Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            I am a...
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'student', label: '🎓 Student' },
              { value: 'health', label: '⚕️ Health Worker' },
              { value: 'faculty', label: '👨‍🏫 Faculty' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePersonaChange(option.value)}
                className={`py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                  persona === option.value
                    ? 'bg-uva-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Origin */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Starting from
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Your address or location"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-uva-primary focus:border-transparent"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Going to
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-uva-primary focus:border-transparent"
          />
        </div>

        {/* Distance */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Distance (miles)
          </label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-uva-primary focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !origin}
          className="w-full bg-uva-primary text-white font-semibold py-3 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Finding routes...' : 'Show Me Options'}
        </button>
      </form>

      {/* Quick Tips */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-600 font-medium mb-2">💡 Quick Tips</p>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• UTS buses are free for UVA students</li>
          <li>• CAT fares are $2 per ride</li>
          <li>• Biking saves cost AND carbon</li>
        </ul>
      </div>
    </div>
  );
}
