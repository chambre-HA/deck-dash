'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RequestPage() {
  const [topicId, setTopicId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [count, setCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Use topicId if provided, otherwise generate from topicName
    const finalTopicId = topicId || topicName.toLowerCase().replace(/\s+/g, '_');

    try {
      const response = await fetch('/api/request-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic_id: finalTopicId,
          topic_name: topicName,
          count: count,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      setSuccess(true);
      setTopicId('');
      setTopicName('');
      setCount(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#4A7FDB] p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-8 text-lg font-semibold"
        >
          ← Back to Decks
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border-2 border-white/50"
        >
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-5xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Request a New Deck
            </h1>
            <p className="text-lg text-gray-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Our AI will generate {count} cards with images automatically
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Name */}
            <div>
              <label htmlFor="topicName" className="block text-base font-bold text-gray-800 mb-2">
                Topic Name
              </label>
              <input
                type="text"
                id="topicName"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g., Characters of One Piece"
                required
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A7FDB] focus:border-transparent placeholder-gray-400 text-lg font-medium transition-all"
              />
              <p className="text-sm text-gray-500 mt-2">
                This is the display name users will see
              </p>
            </div>

            {/* Topic ID */}
            <div>
              <label htmlFor="topicId" className="block text-base font-bold text-gray-800 mb-2">
                Topic ID (URL slug)
              </label>
              <input
                type="text"
                id="topicId"
                value={topicId || topicName.toLowerCase().replace(/\s+/g, '_')}
                onChange={(e) => setTopicId(e.target.value)}
                placeholder="e.g., onepiece_characters"
                required
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A7FDB] focus:border-transparent placeholder-gray-400 text-lg font-medium font-mono transition-all"
              />
              <p className="text-sm text-gray-500 mt-2">
                <strong>Shareable URL:</strong> deck-dash.vibeuncle.com/<span className="text-[#4A7FDB] font-semibold">{topicId || topicName.toLowerCase().replace(/\s+/g, '_') || 'topic_id'}</span>
              </p>
            </div>

            {/* Card Count */}
            <div>
              <label htmlFor="count" className="block text-base font-bold text-gray-800 mb-2">
                Number of Cards: <span className="text-[#4A7FDB]">{count}</span>
              </label>
              <input
                type="range"
                id="count"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                min="10"
                max="50"
                className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>10 cards</span>
                <span>50 cards</span>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-[#4A7FDB]/10 rounded-2xl p-5 border-2 border-[#4A7FDB]/20">
              <p className="text-base font-bold text-gray-800 mb-3">💡 Example Topics:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>• Jujutsu Kaisen Characters</div>
                <div>• Marvel Superheroes</div>
                <div>• Attack on Titan Titans</div>
                <div>• World Capitals</div>
                <div>• Pokémon Generation 1</div>
                <div>• Famous Paintings</div>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#7BDCB5] rounded-2xl p-5 border-2 border-[#6BCCA5]"
              >
                <p className="text-white font-bold text-lg">✓ Request submitted successfully!</p>
                <p className="text-white/90 text-sm mt-1">
                  Your deck will be ready in 2-5 minutes. Refresh the home page to see it.
                </p>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#FF6B6B] rounded-2xl p-5 border-2 border-[#FF5252]"
              >
                <p className="text-white font-bold">✗ Error: {error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#4A7FDB] hover:bg-[#3D6AC4] text-white shadow-xl'
              }`}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                '🚀 Submit Request'
              )}
            </motion.button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-5 bg-blue-50 border-2 border-blue-100 rounded-2xl">
            <p className="text-sm text-gray-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <strong className="text-[#4A7FDB]">How it works:</strong> Your request is sent to our AI automation system.
              Claude will generate the quiz cards and fetch high-quality images from Wikipedia.
              The deck will be added to Google Sheets and appear on the home page automatically.
            </p>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #4A7FDB;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(74, 127, 219, 0.4);
        }

        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #4A7FDB;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(74, 127, 219, 0.4);
        }
      `}</style>
    </div>
  );
}
