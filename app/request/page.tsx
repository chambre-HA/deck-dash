'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAsyncJob } from '@/lib/async-job';
import { ProcessingScreen } from '@/app/components/ProcessingScreen';
import { clearCache } from '@/lib/googleSheets';

interface DeckResult {
  success: boolean;
  topic_id: string;
  topic_name: string;
  cardCount: number;
}

const STATUS_MESSAGES = [
  'Analyzing your topic with AI...',
  'Generating quiz questions...',
  'Searching for high-quality images...',
  'Matching images to each card...',
  'Building your flashcard deck...',
  'Adding cards to the collection...',
  'Polishing the final details...',
  'Almost there, hang tight...',
];

export default function RequestPage() {
  const [topicId, setTopicId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [count, setCount] = useState(30);
  const router = useRouter();

  const job = useAsyncJob<DeckResult>({
    submitUrl: '/api/request-deck',
    statusUrl: '/api/request-deck/status',
    estimatedSeconds: 180,
    onComplete: (data) => {
      // Clear Google Sheets cache so the new deck appears on home page
      clearCache();
      // Redirect to the new deck after a brief success display
      setTimeout(() => {
        router.push(`/${data.topic_id}`);
      }, 2000);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTopicId = topicId || topicName.toLowerCase().replace(/\s+/g, '_');

    await job.submit({
      topic_id: finalTopicId,
      topic_name: topicName,
      count: count,
    });
  };

  // Show ProcessingScreen when job is active
  if (job.status !== 'idle') {
    return (
      <div className="min-h-screen bg-[#4A7FDB] p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => {
              job.reset();
            }}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-8 text-lg font-semibold"
          >
            ← Cancel
          </button>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border-2 border-white/50"
          >
            <ProcessingScreen
              status={job.status}
              elapsed={job.elapsed}
              estimatedSeconds={job.estimatedSeconds}
              title="Creating Your Deck"
              subtitle={topicName}
              statusMessages={STATUS_MESSAGES}
              error={job.error}
              onRetry={job.reset}
              onBack={() => job.reset()}
              successMessage="Your deck is ready!"
              accentColor="#4A7FDB"
            />
          </motion.div>
        </div>
      </div>
    );
  }

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
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A7FDB] focus:border-transparent placeholder-gray-400 text-gray-900 text-lg font-medium transition-all"
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
                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A7FDB] focus:border-transparent placeholder-gray-400 text-gray-900 text-lg font-medium font-mono transition-all"
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

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg bg-[#4A7FDB] hover:bg-[#3D6AC4] text-white shadow-xl"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              🚀 Submit Request
            </motion.button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-5 bg-blue-50 border-2 border-blue-100 rounded-2xl">
            <p className="text-sm text-gray-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <strong className="text-[#4A7FDB]">How it works:</strong> Your request is sent to our AI automation system.
              Claude will generate the quiz cards and fetch high-quality images from Wikipedia.
              You&apos;ll see real-time progress and be automatically redirected when your deck is ready.
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
