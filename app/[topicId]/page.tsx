'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getAvailableTopics } from '@/lib/googleSheets';
import { Topic } from '@/lib/types';
import Link from 'next/link';

export default function ShareableTopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTopic() {
      try {
        const topics = await getAvailableTopics();
        const foundTopic = topics.find(t => t.id === topicId);

        if (!foundTopic) {
          setError('Deck not found');
        } else {
          setTopic(foundTopic);
        }
      } catch (err) {
        setError('Failed to load deck');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTopic();
  }, [topicId]);

  const handlePlay = () => {
    router.push(`/play/${topicId}`);
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${topicId}`
    : `https://deck-dash.vibeuncle.com/${topicId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Deck Dash - ${topic?.name}`,
          text: `Can you recognize all ${topic?.cardCount} cards? Try this quiz!`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#4A7FDB] flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading deck...</div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-[#4A7FDB] flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-12 shadow-2xl text-center max-w-lg"
        >
          <div className="text-8xl mb-6">🎴</div>
          <h1 className="text-4xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Deck Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            The deck "<span className="font-bold text-[#4A7FDB]">{topicId}</span>" doesn't exist yet.
          </p>
          <div className="space-y-3">
            <Link
              href="/request"
              className="block w-full py-4 px-8 bg-[#4A7FDB] hover:bg-[#3D6AC4] rounded-full font-black text-white transition-all shadow-lg hover:shadow-xl text-lg"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              ✨ Request This Deck
            </Link>
            <Link
              href="/"
              className="block w-full py-4 px-8 bg-gray-100 hover:bg-gray-200 rounded-full font-bold text-gray-800 transition-all text-lg"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              🏠 Browse All Decks
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#5B8DEF] to-[#4A7FDB] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-8 text-base font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Browse All Decks
        </Link>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Preview Image with Title Overlay */}
          {topic.previewImage && (
            <div className="h-64 md:h-80 relative overflow-hidden">
              <img
                src={topic.previewImage}
                alt={topic.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2 capitalize" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {topic.name}
                </h1>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.5 8.5l-1.4-4.5C19.9 3.4 19.4 3 18.8 3H8.2C7.6 3 7.1 3.4 6.9 4l-1.4 4.5C5.2 9.2 5 10 5 10.8V19c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8.2c0-.8-.2-1.6-.5-2.3zM9 5h6l1 3H8l1-3zM7 19v-8h10v8H7z"/>
                    <path d="M4 6L2.6 9.5C2.2 10.3 2 11.2 2 12v7h2v-7c0-.5.1-.9.2-1.4L5 7.2 4 6z" opacity="0.5"/>
                  </svg>
                  <span className="text-white font-bold text-sm">{topic.cardCount} cards</span>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-8 md:p-10 text-center">
            <div className="mb-8">
              <p className="text-xl text-gray-700 font-medium mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                See the picture. Pick the answer.
              </p>
              <p className="text-base text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Test your knowledge with {topic.cardCount} cards
              </p>
            </div>

            {/* Ready? Go! Button */}
            <motion.button
              onClick={handlePlay}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-6 rounded-2xl font-black text-3xl bg-gradient-to-r from-[#4A7FDB] to-[#5B8DEF] hover:from-[#3D6AC4] hover:to-[#4A7FDB] text-white transition-all shadow-xl hover:shadow-2xl"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Ready? GO! 🚀
            </motion.button>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
