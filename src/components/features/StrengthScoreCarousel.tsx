import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useCountUp } from '../../hooks/useAnimations';
import { getWilksLevel, getDotsLevel, getIpfglLevel } from '../../lib/calculations';
import Card from '../ui/Card';
import IconButton from '../ui/IconButton';

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
    getLevelFn: getWilksLevel,
  },
  {
    id: 'dots',
    name: 'DOTS',
    description: 'Modern gender-neutral formula used by many federations. 400+ is advanced; 500+ is elite international level.',
    maxValue: 600,
    getLevelFn: getDotsLevel,
  },
  {
    id: 'ipfgl',
    name: 'IPF GL',
    description: 'Official IPF Goodlift points used in international competition. 80+ is world-class; 100+ is podium territory at World Championships.',
    maxValue: 120,
    getLevelFn: getIpfglLevel,
  },
];

export default function StrengthScoreCarousel({
  scores,
  changePercents,
  hasProjectedData,
}: StrengthScoreCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(1); // DOTS is recommended
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
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">
              {currentConfig.name}
            </p>
            <IconButton
              size="sm"
              label={`About ${currentConfig.name}`}
              onClick={() => setShowInfo(v => !v)}
            >
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
            </IconButton>
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
        <IconButton
          label="Previous score type"
          onClick={handlePrevious}
          className="rounded-full"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </IconButton>

        <div className="text-center flex-1 py-4">
          <p className="text-6xl font-black text-gray-900 dark:text-gray-100 tabular-nums leading-none mb-3">
            {animatedScore}
          </p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {currentConfig.getLevelFn(currentScore)}
          </p>
        </div>

        <IconButton
          label="Next score type"
          onClick={handleNext}
          className="rounded-full"
        >
          <ChevronRight className="w-6 h-6" aria-hidden="true" />
        </IconButton>
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
    </Card>
  );
}
