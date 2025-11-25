import { useState } from 'react';
import { X, Smile, Meh, Frown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AccessibleModal from './AccessibleModal';

interface FatigueRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutSessionId: string;
  userId: string;
  onSubmit: () => void;
}

export default function FatigueRatingModal({
  isOpen,
  onClose,
  workoutSessionId,
  userId,
  onSubmit
}: FatigueRatingModalProps) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await supabase
        .from('workout_perceptions')
        .upsert({
          user_id: userId,
          workout_session_id: workoutSessionId,
          perceived_exertion: rating,
          notes: notes.trim()
        });

      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving fatigue rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const getEmoji = (value: number) => {
    if (value <= 3) return <Smile className="w-8 h-8 text-green-500" />;
    if (value <= 7) return <Meh className="w-8 h-8 text-yellow-500" />;
    return <Frown className="w-8 h-8 text-red-500" />;
  };

  const getRatingLabel = (value: number) => {
    if (value === 1) return 'Energized';
    if (value === 2) return 'Very Fresh';
    if (value === 3) return 'Fresh';
    if (value === 4) return 'Good';
    if (value === 5) return 'Normal';
    if (value === 6) return 'Slight Fatigue';
    if (value === 7) return 'Tired';
    if (value === 8) return 'Very Tired';
    if (value === 9) return 'Exhausted';
    return 'Completely Drained';
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="How did this workout feel?"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {getEmoji(rating)}
          </div>
          <p className="text-2xl font-bold text-gray-900">{getRatingLabel(rating)}</p>
          <p className="text-sm text-gray-600 mt-1">Rating: {rating}/10</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Perceived Exertion
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 - Easy</span>
            <span>5 - Moderate</span>
            <span>10 - Maximum</span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="fatigue-notes" className="block text-sm font-medium text-gray-700">
            Notes (Optional)
          </label>
          <textarea
            id="fatigue-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Any specific feelings or observations about this workout..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Submit Rating'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Your rating helps us provide better recovery recommendations
        </p>
      </div>
    </AccessibleModal>
  );
}
