'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { CheckCircle2, XCircle, Volume2, VolumeX } from 'lucide-react';
import { Card } from '@/lib/types';
import { getCardsForTopic } from '@/lib/googleSheets';

// Duration of each flip half in ms — must match spring config settle time
const FLIP_HALF_MS = 320;

export default function PlayPage() {
  const params  = useParams();
  const router  = useRouter();
  const topicId = decodeURIComponent(params.topicId as string);

  const [cards, setCards]               = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCards, setCorrectCards] = useState<Card[]>([]);
  const [wrongCards,   setWrongCards]   = useState<Card[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [startTime,    setStartTime]    = useState<number>(0);
  const [elapsedTime,  setElapsedTime]  = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback,   setShowFeedback]   = useState(false);

  // shuffledChoices is the canonical answer order for the *visible* card
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);

  const [isShaking,  setIsShaking]  = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // displayIndex is what is visually rendered — lags behind currentIndex by half a flip
  const [displayIndex, setDisplayIndex] = useState(0);

  const isBusy = useRef(false); // prevent double-clicks during transition

  // ── Sound ──────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deckdash-muted') === 'true';
    }
    return false;
  });
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const clockAudio  = useRef<HTMLAudioElement | null>(null);
  const correctAudio = useRef<HTMLAudioElement | null>(null);
  const wrongAudio   = useRef<HTMLAudioElement | null>(null);

  // Initialise audio elements once on mount
  useEffect(() => {
    clockAudio.current   = new Audio('/clock.mp3');
    correctAudio.current = new Audio('/correct.mp3');
    wrongAudio.current   = new Audio('/wrong.mp3');
    clockAudio.current.loop   = true;
    clockAudio.current.volume = 0.4;
    return () => {
      clockAudio.current?.pause();
    };
  }, []);

  const playCorrect = useCallback(() => {
    if (isMutedRef.current || !correctAudio.current) return;
    correctAudio.current.currentTime = 0;
    correctAudio.current.play().catch(() => {});
  }, []);

  const playWrong = useCallback(() => {
    if (isMutedRef.current || !wrongAudio.current) return;
    wrongAudio.current.currentTime = 0;
    wrongAudio.current.play().catch(() => {});
  }, []);

  // Start/stop clock when cards are loaded and game is in progress
  useEffect(() => {
    if (!clockAudio.current) return;
    if (cards.length > 0 && currentIndex < cards.length) {
      if (!isMuted) {
        clockAudio.current.play().catch(() => {});
      } else {
        clockAudio.current.pause();
      }
    } else {
      clockAudio.current.pause();
    }
  }, [cards, currentIndex, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('deckdash-muted', String(next));
      return next;
    });
  }, []);

  // ── Springs ────────────────────────────────────────────────────────
  const [drag, dragApi] = useSpring(() => ({
    x: 0, y: 0, rot: 0, scale: 1,
    config: { tension: 350, friction: 28 },
  }));

  const [flip, flipApi] = useSpring(() => ({
    rotateY: 0,
    config: { tension: 320, friction: 28 },
  }));

  // ── Image preloading ───────────────────────────────────────────────
  useEffect(() => {
    if (cards.length === 0) return;
    [1, 2].forEach(offset => {
      const idx = currentIndex + offset;
      if (idx < cards.length) {
        const img = new window.Image();
        img.src = cards[idx].imageUrl;
      }
    });
  }, [currentIndex, cards]);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const id = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(id);
    }
  }, [cards, currentIndex, startTime]);

  // ── Shuffle choices when currentIndex changes ──────────────────────
  useEffect(() => {
    if (cards.length === 0 || currentIndex >= cards.length) return;
    const card = cards[currentIndex];
    setShuffledChoices(shuffleArray([card.correctAnswer, ...card.wrongAnswers]));
  }, [currentIndex, cards]);

  // ── Load cards ─────────────────────────────────────────────────────
  useEffect(() => { loadCards(); }, [topicId]);

  async function loadCards() {
    try {
      setLoading(true);
      const data = await getCardsForTopic(topicId, 30);
      setCards(data);
      setDisplayIndex(0);
      setStartTime(Date.now());
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  function shuffleArray<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // ── 3D flip — pure setTimeout, no onRest ──────────────────────────
  function doFlip(nextIdx: number, callback: () => void) {
    setIsFlipping(true);

    // Phase 1: fold current card edge-on (0 → 90°)
    flipApi.start({ rotateY: 90, config: { tension: 320, friction: 28 } });

    setTimeout(() => {
      // Midpoint: swap content while card is edge-on (invisible)
      setDisplayIndex(nextIdx);

      // Instantly jump to -90° then spring open (−90 → 0°)
      flipApi.start({ rotateY: -90, immediate: true });
      flipApi.start({ rotateY: 0, config: { tension: 320, friction: 28 } });

      setTimeout(() => {
        setIsFlipping(false);
        isBusy.current = false;
        callback();
      }, FLIP_HALF_MS + 50); // slight buffer for spring settle
    }, FLIP_HALF_MS);
  }

  // ── Answer selection ───────────────────────────────────────────────
  function handleAnswerSelect(answer: string) {
    if (isBusy.current) return;
    isBusy.current = true;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const currentCard = cards[currentIndex];
    const isCorrect   = answer === currentCard.correctAnswer;

    if (!isCorrect) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      playWrong();
    } else {
      dragApi.start({ scale: 1.04, config: { tension: 600, friction: 10 } });
      setTimeout(() => dragApi.start({ scale: 1, config: { tension: 300, friction: 20 } }), 200);
      playCorrect();
    }

    // Wait for feedback to show, then flip
    setTimeout(() => {
      const nextCorrect = isCorrect ? [...correctCards, currentCard] : correctCards;
      const nextWrong   = isCorrect ? wrongCards : [...wrongCards, currentCard];
      const nextIdx     = currentIndex + 1;

      if (nextIdx >= cards.length) {
        // Last card — stop clock and navigate to results
        clockAudio.current?.pause();
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        const result = {
          correctCount: nextCorrect.length,
          wrongCount:   nextWrong.length,
          timeTaken,
          correctCards: nextCorrect,
          wrongCards:   nextWrong,
        };
        sessionStorage.setItem('gameResult', JSON.stringify(result));
        router.push(`/results/${topicId}`);
        return;
      }

      doFlip(nextIdx, () => {
        setCorrectCards(nextCorrect);
        setWrongCards(nextWrong);
        setCurrentIndex(nextIdx);
        setSelectedAnswer(null);
        setShowFeedback(false);
        dragApi.start({ x: 0, y: 0, rot: 0, scale: 1, immediate: true });
      });
    }, 800);
  }

  // ── Drag ───────────────────────────────────────────────────────────
  const bind = useDrag(({ down, movement: [mx, my] }) => {
    if (showFeedback || isFlipping) return;
    dragApi.start({
      x: down ? mx : 0,
      y: down ? my : 0,
      rot: down ? mx / 18 : 0,
      scale: down ? 1.05 : 1,
      config: down ? { tension: 800, friction: 50 } : { tension: 350, friction: 22 },
    });
  });

  // ── Loading / empty ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#4A7FDB] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-20 h-20 border-8 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
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
          <button onClick={() => router.push('/')} className="bg-white text-[#4A7FDB] px-8 py-3 rounded-full font-bold">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  const displayCard = cards[displayIndex] ?? cards[currentIndex];
  // During the flip the display card changes but shuffledChoices hasn't updated yet.
  // Use shuffledChoices only when we're showing the current card (not mid-flip-new-card).
  const visibleChoices = displayIndex === currentIndex
    ? shuffledChoices
    : shuffleArray([displayCard.correctAnswer, ...displayCard.wrongAnswers]);

  const cardStatuses = cards.map((_, idx) => {
    if (idx < currentIndex) return correctCards.some(c => cards.indexOf(c) === idx) ? 'correct' : 'wrong';
    if (idx === currentIndex) return 'current';
    return 'pending';
  });

  return (
    <div className="h-dvh bg-[#4A7FDB] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4 z-10 relative">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-white hover:text-white/80 transition-colors text-2xl flex-shrink-0">←</button>

            <div className="text-white font-bold text-base flex-shrink-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {currentIndex + 1}/{cards.length}
            </div>

            <div className="flex-1 flex flex-wrap justify-center gap-1.5 px-2">
              {cardStatuses.map((status, idx) => (
                <div key={idx} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  status === 'correct'    ? 'bg-[#10B981] shadow-sm shadow-green-500/50'
                  : status === 'wrong'   ? 'bg-[#FF6B6B] shadow-sm shadow-red-500/50'
                  : status === 'current' ? 'bg-white scale-125 shadow-md'
                  : 'bg-transparent border-2 border-white/40'
                }`} />
              ))}
            </div>

            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white font-bold text-sm border border-white/30 flex-shrink-0">
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </div>

            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-full border border-white/30 text-white transition-all duration-200 hover:scale-110 active:scale-95"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0" style={{ perspective: '1400px' }}>
        <div className="w-full max-w-2xl h-full flex flex-col">
          {/* Outer drag wrapper */}
          <animated.div
            {...bind()}
            style={{ x: drag.x, y: drag.y, scale: drag.scale, rotate: drag.rot, touchAction: 'none' }}
            className="h-full flex flex-col"
          >
            {/* Inner flip wrapper */}
            <animated.div
              style={{ rotateY: flip.rotateY }}
              className={[
                'bg-white rounded-3xl shadow-2xl overflow-hidden will-change-transform transition-shadow duration-300 flex flex-col h-full',
                !isFlipping ? 'cursor-grab active:cursor-grabbing' : '',
                isShaking ? 'shake' : '',
                // Colored ring based on feedback
                showFeedback && displayIndex === currentIndex && selectedAnswer
                  ? selectedAnswer === displayCard.correctAnswer
                    ? 'ring-[6px] ring-[#10B981] shadow-[0_0_40px_rgba(16,185,129,0.5)]'
                    : 'ring-[6px] ring-[#FF6B6B] shadow-[0_0_40px_rgba(255,107,107,0.5)]'
                  : ''
              ].filter(Boolean).join(' ')}
            >
              {/* Card Image */}
              <div className="relative flex-1 min-h-0 bg-gradient-to-br from-gray-100 to-gray-200 select-none">
                <img
                  src={displayCard.imageUrl}
                  alt="Card"
                  className="w-full h-full object-cover object-top pointer-events-none"
                  draggable={false}
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-bold text-[#4A7FDB] shadow-lg pointer-events-none">
                  Who is this?
                </div>

                {/* Answer feedback overlay */}
                {showFeedback && selectedAnswer && displayIndex === currentIndex && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    selectedAnswer === displayCard.correctAnswer ? 'bg-green-400/20' : 'bg-red-400/20'
                  }`}>
                    {selectedAnswer === displayCard.correctAnswer ? (
                      <CheckCircle2
                        size={108}
                        strokeWidth={2}
                        className="text-[#10B981] drop-shadow-lg"
                        style={{ filter: 'drop-shadow(0 4px 20px rgba(16,185,129,0.7))' }}
                      />
                    ) : (
                      <XCircle
                        size={108}
                        strokeWidth={2}
                        className="text-[#FF6B6B] drop-shadow-lg"
                        style={{ filter: 'drop-shadow(0 4px 20px rgba(255,107,107,0.7))' }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Answer Choices */}
              <div className="p-4 flex-shrink-0">
                <div className="grid grid-cols-1 gap-2">
                  {visibleChoices.map((choice, idx) => {
                    const isCorrect  = choice === displayCard.correctAnswer;
                    const isSelected = choice === selectedAnswer;
                    let cls = 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-2 border-gray-200';
                    if (showFeedback && isSelected && displayIndex === currentIndex) {
                      cls = isCorrect
                        ? 'bg-[#7BDCB5] text-white border-2 border-[#6BCCA5] shadow-lg scale-105'
                        : 'bg-[#FF6B6B] text-white border-2 border-[#FF5252] shadow-lg scale-105';
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(choice)}
                        disabled={isBusy.current || isFlipping || displayIndex !== currentIndex}
                        className={`${cls} px-4 py-3 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed w-full`}
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </div>
            </animated.div>
          </animated.div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-16px); }
          30%       { transform: translateX(16px); }
          45%       { transform: translateX(-12px); }
          60%       { transform: translateX(12px); }
          75%       { transform: translateX(-6px); }
          90%       { transform: translateX(6px); }
        }
        .shake { animation: shake 0.55s ease-in-out; }
      `}</style>
    </div>
  );
}
