import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useCountUp } from '../../hooks/useAnimations';

interface StrengthScoreCarouselProps {
  scores: {
    wilks: number;
    dots: number;
    ipfgl: number;
  };
  changePercents: {
    wilks: string;
    dots: string;
    ipfgl: string;
  };
  hasProjectedData: boolean;
}

interface ScoreConfig {
  id: string;
  name: string;
  description: string;
  maxValue: number;
  getLevelFn: (score: number) => string;
}

const scoreConfigs: ScoreConfig[] = [
  {
    id: 'wilks',
    name: 'Wilks',
    description: 'Bodyweight-adjusted total, the oldest standard formula. 300+ is competitive club level; 400+ qualifies for most national events.',
    maxValue: 600,
    getLevelFn: (score: number) => {
      if (score < 200) return 'Beginner';
      if (score < 238) return 'Novice';
      if (score < 326) return 'Intermediate';
      if (score < 414) return 'Advanced';
      return 'Elite';
    },
  },
  {
    id: 'dots',
    name: 'DOTS',
    description: 'Modern gender-neutral formula used by many federations. 400+ is advanced; 500+ is elite international level.',
    maxValue: 600,
    getLevelFn: (score: number) => {
      if (score < 300) return 'Beginner';
      if (score < 350) return 'Novice';
      if (score < 450) return 'Intermediate';
      if (score < 550) return 'Advanced';
      return 'Elite';
    },
  },
  {
    id: 'ipfgl',
    name: 'IPF GL',
    description: 'Official IPF Goodlift points used in international competition. 80+ is world-class; 100+ is podium territory at World Championships.',
    maxValue: 120,
    getLevelFn: (score: number) => {
      if (score < 40) return 'Beginner';
      if (score < 55) return 'Novice';
      if (score < 70) return 'Intermediate';
      if (score < 85) return 'Advanced';
      return 'Elite';
    },
  },
];

export default function StrengthScoreCarousel({
  scores,
  changePercents,
  hasProjectedData,
}: StrengthScoreCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const currentConfig = scoreConfigs[currentIndex];
  const currentScore = scores[currentConfig.id as keyof typeof scores];
  const currentChangePercent = changePercents[currentConfig.id as keyof typeof changePercents];

  const animatedScore = useCountUp(currentScore, 1500, currentConfig.id === 'ipfgl' ? 1 : 0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? scoreConfigs.length - 1 : prev - 1));
    setShowInfo(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === scoreConfigs.length - 1 ? 0 : prev + 1));
    setShowInfo(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">
              {currentConfig.name}
            </p>
            <button
              onClick={() => setShowInfo(v => !v)}
              aria-label={`About ${currentConfig.name}`}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          {showInfo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pr-4">
              {currentConfig.description}
            </p>
          )}
        </div>
        {hasProjectedData && parseFloat(currentChangePercent) !== 0 && (
          <div
            className={`text-sm font-semibold flex-shrink-0 ${
              parseFloat(currentChangePercent) > 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {parseFloat(currentChangePercent) > 0 && '+'}{currentChangePercent}%
          </div>
        )}
      </div>

      <div className="flex items-center justify-center mb-4 gap-4">
        <button
          onClick={handlePrevious}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Previous score type"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="text-center flex-1 py-4">
          <p className="text-6xl font-black text-gray-900 dark:text-gray-100 tabular-nums leading-none mb-3">
            {animatedScore}
          </p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {currentConfig.getLevelFn(currentScore)}
          </p>
        </div>

        <button
          onClick={handleNext}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Next score type"
        >
          <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {scoreConfigs.map((config, index) => (
          <button
            key={config.id}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex
                ? 'bg-blue-600 dark:bg-blue-400'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-label={`Go to ${config.name}`}
          />
        ))}
      </div>
    </div>
  );
}
