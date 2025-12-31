'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, Topic } from '@/lib/types';
import { calculateScore, formatTime, getPerformanceRating } from '@/lib/scoring';
import { getAvailableTopics } from '@/lib/googleSheets';
import Link from 'next/link';
import domtoimage from 'dom-to-image-more';

interface GameResult {
  correctCount: number;
  wrongCount: number;
  timeTaken: number;
  correctCards: Card[];
  wrongCards: Card[];
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;

  const [result, setResult] = useState<GameResult | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [showCorrectStack, setShowCorrectStack] = useState(false);
  const [showWrongStack, setShowWrongStack] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const resultsCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load result from sessionStorage
    const stored = sessionStorage.getItem('gameResult');
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      // No result found, redirect to home
      router.push('/');
    }

    // Load topic information
    async function loadTopic() {
      try {
        const topics = await getAvailableTopics();
        const foundTopic = topics.find(t => t.id === topicId);
        if (foundTopic) {
          setTopic(foundTopic);
        }
      } catch (err) {
        console.error('Failed to load topic:', err);
      }
    }
    loadTopic();
  }, [router, topicId]);

  if (!result) {
    return (
      <div className="min-h-screen bg-[#4A7FDB] flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading results...</div>
      </div>
    );
  }

  const totalCards = result.correctCount + result.wrongCount;
  const scoreData = calculateScore(result.correctCount, totalCards, result.timeTaken);
  const performance = getPerformanceRating(result.correctCount, totalCards);

  const percentage = Math.round((result.correctCount / totalCards) * 100);

  const handleShareImage = async () => {
    if (!resultsCardRef.current) return;

    try {
      setIsCapturing(true);

      // Capture the results card using dom-to-image-more (supports modern CSS)
      // Use simpler options to avoid errors
      const blob = await domtoimage.toBlob(resultsCardRef.current, {
        quality: 0.95,
        bgcolor: '#ffffff',
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const shareUrl = `${window.location.origin}/${topicId}`;
      const shareText = `I scored ${scoreData.totalScore.toLocaleString()} points on ${topic?.name || 'Deck Dash'}! Can you beat my score?\n\n${shareUrl}`;

      // Try to use native share with image if supported (mainly mobile)
      if (navigator.share) {
        try {
          const file = new File([blob], 'deck-dash-result.png', { type: 'image/png' });

          // Check if we can share files
          const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

          if (canShareFiles) {
            await navigator.share({
              title: `Deck Dash - ${topic?.name}`,
              text: shareText,
              files: [file],
            });
            setIsCapturing(false);
            return;
          }
        } catch (shareError: any) {
          // If user cancels share dialog, that's ok - don't show error
          if (shareError.name === 'AbortError') {
            setIsCapturing(false);
            return;
          }
          // Otherwise continue to clipboard fallback
          console.log('Native share failed, trying clipboard...', shareError);
        }
      }

      // Fallback: Copy image to clipboard (desktop)
      if (navigator.clipboard && ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          alert('Result image copied to clipboard! Paste it in your messenger to share.');
        } catch (clipError) {
          console.error('Clipboard failed:', clipError);
          // Last resort: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'deck-dash-result.png';
          a.click();
          URL.revokeObjectURL(url);
          alert('Result image downloaded to your device!');
        }
      } else {
        // Very old browser - download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deck-dash-result.png';
        a.click();
        URL.revokeObjectURL(url);
        alert('Result image downloaded to your device!');
      }
    } catch (error) {
      console.error('Share image failed:', error);
      alert(`Failed to capture image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShareLink = async () => {
    const shareUrl = `${window.location.origin}/${topicId}`;
    const shareText = `I scored ${scoreData.totalScore.toLocaleString()} points on ${topic?.name || 'Deck Dash'}! Can you beat my score?\n\n${shareUrl}`;

    try {
      // Try native share first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `Deck Dash - ${topic?.name}`,
          text: shareText,
        });
      } else {
        // Fallback: Copy to clipboard (desktop)
        await navigator.clipboard.writeText(shareText);
        alert('Link and score copied to clipboard!');
      }
    } catch (error) {
      console.error('Share link failed:', error);
      // Last resort: just copy the URL
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (e) {
        alert('Unable to share. Please copy the URL manually.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#5B8DEF] to-[#4A7FDB] flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Main Results Card */}
        <motion.div
          ref={resultsCardRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6"
        >
          {/* Deck Preview Image */}
          {topic?.previewImage && (
            <div className="h-56 relative overflow-hidden">
              <img
                src={topic.previewImage}
                alt={topic.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg mb-2 capitalize" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {topic.name}
                  </h3>
                  <p className="text-white/90 text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {result.correctCount} / {totalCards} correct
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="p-8">
            {/* Score Display */}
            <div className="text-center mb-8">
              <div className="text-8xl font-black text-[#4A7FDB] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {scoreData.totalScore.toLocaleString()}
              </div>
              <p className="text-gray-600 text-lg font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {percentage}% Correct · {formatTime(result.timeTaken)}
              </p>
              {scoreData.timeBonus > 0 && (
                <p className="text-[#10B981] text-sm font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  +{scoreData.timeBonus.toLocaleString()} speed bonus! ⚡
                </p>
              )}
            </div>

            {/* Visual Dots Progress */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {Array.from({ length: totalCards }).map((_, index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full ${
                    index < result.correctCount
                      ? 'bg-[#10B981]'
                      : 'bg-[#FF6B6B]'
                  }`}
                />
              ))}
            </div>

            {/* Review Cards Link */}
            {result.wrongCount > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setShowWrongStack(!showWrongStack)}
                  className="text-[#4A7FDB] hover:text-[#3D6AC4] font-semibold text-base underline"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {showWrongStack ? 'Hide' : 'Review'} {result.wrongCount} missed card{result.wrongCount > 1 ? 's' : ''}
                </button>
              </div>
            )}

            {/* Missed Cards */}
            {showWrongStack && result.wrongCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 space-y-3 max-h-80 overflow-y-auto"
              >
                {result.wrongCards.map((card, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                  >
                    <img
                      src={card.imageUrl}
                      alt={card.correctAnswer}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{card.correctAnswer}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons - Single Row */}
        <div className="flex gap-2">
          {/* Home - Green Icon Only */}
          <Link
            href="/"
            className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-3.5 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
            title="Go home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          {/* Play Again - Blue */}
          <Link
            href={`/play/${topicId}`}
            className="flex-1 bg-white text-[#4A7FDB] px-4 py-3.5 rounded-2xl font-bold text-sm text-center hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Play Again
          </Link>

          {/* Share Image - Orange */}
          <button
            onClick={handleShareImage}
            disabled={isCapturing}
            className="flex-1 bg-[#FF6B6B] hover:bg-[#FF5252] text-white px-4 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            title="Capture and share result as image"
          >
            {isCapturing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Share Image
              </>
            )}
          </button>

          {/* Share Deck - Orange */}
          <button
            onClick={handleShareLink}
            className="flex-1 bg-[#FF6B6B] hover:bg-[#FF5252] text-white px-4 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            title="Share deck link"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Deck
          </button>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
