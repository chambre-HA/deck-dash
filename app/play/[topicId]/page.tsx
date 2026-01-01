'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/lib/types';
import { getCardsForTopic } from '@/lib/googleSheets';

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCards, setCorrectCards] = useState<Card[]>([]);
  const [wrongCards, setWrongCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Shuffle choices for current card
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);

  useEffect(() => {
    loadCards();
  }, [topicId]);

  useEffect(() => {
    // Timer
    if (cards.length > 0 && currentIndex < cards.length) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cards, currentIndex, startTime]);

  useEffect(() => {
    // Shuffle choices when card changes
    if (cards.length > 0 && currentIndex < cards.length) {
      const currentCard = cards[currentIndex];
      const allChoices = [currentCard.correctAnswer, ...currentCard.wrongAnswers];
      setShuffledChoices(shuffleArray(allChoices));
    }
  }, [currentIndex, cards]);

  async function loadCards() {
    try {
      setLoading(true);
      const data = await getCardsForTopic(topicId, 30);
      setCards(data);
      setStartTime(Date.now());
    } catch (err) {
      console.error('Failed to load cards:', err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function handleAnswerSelect(answer: string) {
    if (showFeedback) return; // Prevent multiple selections

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const currentCard = cards[currentIndex];
    const isCorrect = answer === currentCard.correctAnswer;

    // Animate after short delay
    setTimeout(() => {
      if (isCorrect) {
        setCorrectCards([...correctCards, currentCard]);
      } else {
        setWrongCards([...wrongCards, currentCard]);
      }

      // Move to next card
      if (currentIndex + 1 >= cards.length) {
        // Game finished
        finishGame();
      } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 800);
  }

  function finishGame() {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const result = {
      correctCount: correctCards.length + (selectedAnswer === cards[currentIndex].correctAnswer ? 1 : 0),
      wrongCount: wrongCards.length + (selectedAnswer !== cards[currentIndex].correctAnswer ? 1 : 0),
      timeTaken,
      correctCards: selectedAnswer === cards[currentIndex].correctAnswer
        ? [...correctCards, cards[currentIndex]]
        : correctCards,
      wrongCards: selectedAnswer !== cards[currentIndex].correctAnswer
        ? [...wrongCards, cards[currentIndex]]
        : wrongCards
    };

    // Store result in sessionStorage
    sessionStorage.setItem('gameResult', JSON.stringify(result));
    router.push(`/results/${topicId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#4A7FDB] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-20 h-20 border-8 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-2xl font-bold">Loading cards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#4A7FDB] flex items-center justify-center">
        <div className="text-center text-white bg-white/10 backdrop-blur-md rounded-3xl p-12 max-w-md border-2 border-white/20">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-2xl font-bold mb-4">No cards available</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-[#4A7FDB] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const cardsRemaining = cards.length - currentIndex;

  // Create array representing card status
  const cardStatuses = cards.map((_, index) => {
    if (index < currentIndex) {
      // Check if this card was answered correctly
      return correctCards.some(c => cards.indexOf(c) === index) ? 'correct' : 'wrong';
    } else if (index === currentIndex) {
      return 'current';
    } else {
      return 'pending';
    }
  });

  return (
    <div className="min-h-screen bg-[#4A7FDB] flex flex-col">
      {/* Header with Progress Dots */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-white/80 transition-colors text-2xl flex-shrink-0"
            >
              ←
            </button>

            {/* Card Counter */}
            <div className="text-white font-bold text-base flex-shrink-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {currentIndex + 1}/{cards.length}
            </div>

            {/* Progress Dots */}
            <div className="flex-1 flex flex-wrap justify-center gap-1.5 px-2">
              {cardStatuses.map((status, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    status === 'correct'
                      ? 'bg-[#10B981] shadow-sm shadow-green-500/50' // Green for correct
                      : status === 'wrong'
                      ? 'bg-[#FF6B6B] shadow-sm shadow-red-500/50' // Orange/Red for wrong
                      : status === 'current'
                      ? 'bg-white scale-125 shadow-md' // White and larger for current
                      : 'bg-transparent border-2 border-white/40' // Empty outline for pending
                  }`}
                  title={
                    status === 'correct'
                      ? 'Correct'
                      : status === 'wrong'
                      ? 'Wrong'
                      : status === 'current'
                      ? 'Current'
                      : 'Pending'
                  }
                />
              ))}
            </div>

            {/* Timer */}
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white font-bold text-sm border border-white/30 flex-shrink-0">
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                x: selectedAnswer === currentCard.correctAnswer ? 400 : -400,
                opacity: 0,
                rotate: selectedAnswer === currentCard.correctAnswer ? 20 : -20,
                scale: 0.8
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Card Image - Square Aspect Ratio */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                <img
                  src={currentCard.imageUrl}
                  alt="Card"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-bold text-[#4A7FDB] shadow-lg">
                  Who is this?
                </div>
              </div>

              {/* Answer Choices */}
              <div className="p-6">
                <div className="grid grid-cols-1 gap-3">
                  {shuffledChoices.map((choice, index) => {
                    const isCorrect = choice === currentCard.correctAnswer;
                    const isSelected = choice === selectedAnswer;

                    let buttonClass = 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-2 border-gray-200';

                    if (showFeedback && isSelected) {
                      buttonClass = isCorrect
                        ? 'bg-[#7BDCB5] text-white border-2 border-[#6BCCA5] shadow-lg scale-105'
                        : 'bg-[#FF6B6B] text-white border-2 border-[#FF5252] shadow-lg scale-105';
                    }

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswerSelect(choice)}
                        disabled={showFeedback}
                        className={`${buttonClass} px-6 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-102 disabled:cursor-not-allowed`}
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                        whileHover={!showFeedback ? { scale: 1.02 } : {}}
                        whileTap={!showFeedback ? { scale: 0.98 } : {}}
                      >
                        {choice}
                        {showFeedback && isSelected && (
                          <span className="ml-2">{isCorrect ? '✓' : '✗'}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>


      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
