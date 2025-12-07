import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AccessibleProgressRing from '../accessible/AccessibleProgressRing';
import { useCountUp } from '../../hooks/useAnimations';

interface StrengthScoreCarouselProps {
  scores: {
    wilks: number;
    wilks2: number;
    dots: number;
    ipfgl: number;
  };
  changePercents: {
    wilks: string;
    wilks2: string;
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
    name: 'Wilks Score',
    description: 'Classic strength formula (1978)',
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
    id: 'wilks2',
    name: 'Wilks-2',
    description: 'Updated Wilks formula (2020)',
    maxValue: 600,
    getLevelFn: (score: number) => {
      if (score < 250) return 'Beginner';
      if (score < 300) return 'Novice';
      if (score < 400) return 'Intermediate';
      if (score < 500) return 'Advanced';
      return 'Elite';
    },
  },
  {
    id: 'dots',
    name: 'DOTS',
    description: 'Dynamic strength scoring',
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
    name: 'IPF GL Points',
    description: 'IPF Goodlift formula',
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

  const currentConfig = scoreConfigs[currentIndex];
  const currentScore = scores[currentConfig.id as keyof typeof scores];
  const currentChangePercent = changePercents[currentConfig.id as keyof typeof changePercents];

  const animatedScore = useCountUp(currentScore, 1500, currentConfig.id === 'ipfgl' ? 1 : 0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? scoreConfigs.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === scoreConfigs.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
            {currentConfig.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {currentConfig.description}
          </p>
        </div>
        {hasProjectedData && parseFloat(currentChangePercent) !== 0 && (
          <div
            className={`text-sm font-semibold ${
              parseFloat(currentChangePercent) > 0
                ? 'text-green-600'
                : parseFloat(currentChangePercent) < 0
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {parseFloat(currentChangePercent) > 0 && '+'}({currentChangePercent}%)
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

        <AccessibleProgressRing
          value={currentScore}
          max={currentConfig.maxValue}
          label={currentConfig.name}
          description={currentConfig.getLevelFn(currentScore)}
          size={192}
          showValue={true}
        />

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
