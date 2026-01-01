'use client';

import { useState, useEffect } from 'react';
import { Topic } from '@/lib/types';
import { getAvailableTopics, clearCache } from '@/lib/googleSheets';
import Link from 'next/link';

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailableTopics();
      setTopics(data);
    } catch (err) {
      console.error('Failed to load topics:', err);
      setError('Failed to load topics. Please check your Google Sheets configuration.');
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    clearCache();
    loadTopics();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#5B8DEF] to-[#4A7FDB]">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-[#5B8DEF] to-[#4A7FDB] pb-20">
        <div className="container mx-auto px-4 pt-12 pb-16">
          {/* Header */}
          <div className="text-center mb-12 animate-slideDown">
            <div className="inline-block mb-6">
              <h1 className="text-6xl md:text-7xl font-black text-white mb-3 tracking-tight flex items-center justify-center gap-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <span className="text-[#FFD93D] text-7xl md:text-8xl">⚡</span>
                <span>DECK <span className="text-[#FFD93D]">DASH</span></span>
              </h1>
              <div className="h-1.5 bg-[#FFD93D] rounded-full w-3/4 mx-auto"></div>
            </div>
            <p className="text-xl md:text-2xl text-white/95 mb-10 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              See the picture, pick the answer. Race against time!
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleRefresh}
                className="group bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-full text-base font-semibold transition-all hover:scale-105 border-2 border-white/30 hover:border-white/50"
              >
                <svg className="w-5 h-5 inline-block mr-2 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Decks
              </button>
              <button
                onClick={() => setShowHowToPlay(!showHowToPlay)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-full text-base font-semibold transition-all hover:scale-105 border-2 border-white/30 hover:border-white/50"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Play
                <svg className={`w-4 h-4 inline-block ml-2 transition-transform duration-300 ${showHowToPlay ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <Link
                href="/request"
                className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white px-8 py-3 rounded-full text-base font-bold transition-all hover:scale-105 shadow-lg hover:shadow-xl"
              >
                + Request New Deck
              </Link>
            </div>

            {/* How to Play Expandable Tooltip */}
            {showHowToPlay && (
              <div className="mt-8 max-w-3xl mx-auto animate-slideDown">
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-3xl font-black text-[#4A7FDB] mb-6 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    How to Play
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { emoji: '🎯', text: 'Select a deck you want to master' },
                      { emoji: '👀', text: 'Look at the image and pick the right answer' },
                      { emoji: '👈👉', text: 'Swipe right for correct, left for wrong' },
                      { emoji: '⚡', text: 'Answer fast to earn bonus points!' }
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-4 bg-[#4A7FDB]/10 rounded-2xl p-4 border border-[#4A7FDB]/20">
                        <div className="text-3xl flex-shrink-0">{step.emoji}</div>
                        <div className="text-gray-800 text-base font-medium pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {step.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Section with Light Background */}
      <div className="bg-[#F5F7FA] -mt-12 rounded-t-[3rem] min-h-screen">
        <div className="container mx-auto px-4 pt-16 pb-20">

          {/* Section Header */}
          {!loading && !error && topics.length > 0 && (
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Choose Your Deck
              </h2>
              <p className="text-lg text-gray-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Select a topic and test your knowledge
              </p>
            </div>
          )}

        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-700 py-20">
            <div className="inline-block">
              <div className="w-20 h-20 border-8 border-gray-300 border-t-[#4A7FDB] rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-2xl font-semibold">Loading decks...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-2xl animate-slideUp">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="font-bold text-2xl text-gray-800 mb-2">Oops!</p>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadTopics}
              className="w-full bg-[#4A7FDB] text-white px-6 py-3 rounded-full font-bold hover:bg-[#3D6AC4] transition-all hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && topics.length === 0 && (
          <div className="text-center text-gray-700 py-20 animate-slideUp">
            <div className="mb-6 flex justify-center">
              <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.5 8.5l-1.4-4.5C19.9 3.4 19.4 3 18.8 3H8.2C7.6 3 7.1 3.4 6.9 4l-1.4 4.5C5.2 9.2 5 10 5 10.8V19c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8.2c0-.8-.2-1.6-.5-2.3zM9 5h6l1 3H8l1-3zM7 19v-8h10v8H7z"/>
                <path d="M4 6L2.6 9.5C2.2 10.3 2 11.2 2 12v7h2v-7c0-.5.1-.9.2-1.4L5 7.2 4 6z" opacity="0.5"/>
              </svg>
            </div>
            <p className="text-3xl font-bold mb-2">No decks yet!</p>
            <p className="text-xl text-gray-600 mb-8">
              Add some cards to your Google Sheet to get started
            </p>
            <Link
              href="/request"
              className="inline-block bg-[#FF6B6B] hover:bg-[#FF5252] text-white px-8 py-4 rounded-full text-lg font-bold transition-all hover:scale-105 shadow-lg"
            >
              Request Your First Deck
            </Link>
          </div>
        )}

        {/* Topics Grid */}
        {!loading && !error && topics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
            {topics.map((topic, index) => (
              <Link
                key={topic.id}
                href={`/${topic.id}`}
                className="group block"
                style={{
                  animation: `slideUp 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="bg-white rounded-3xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl relative h-full flex flex-col">
                  {/* Preview Image */}
                  {topic.previewImage && (
                    <div className="h-56 overflow-hidden bg-gray-100 relative flex-shrink-0">
                      <img
                        src={topic.previewImage}
                        alt={topic.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

                      {/* Card Count Badge */}
                      <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#4A7FDB]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21.5 8.5l-1.4-4.5C19.9 3.4 19.4 3 18.8 3H8.2C7.6 3 7.1 3.4 6.9 4l-1.4 4.5C5.2 9.2 5 10 5 10.8V19c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8.2c0-.8-.2-1.6-.5-2.3zM9 5h6l1 3H8l1-3zM7 19v-8h10v8H7z"/>
                          <path d="M4 6L2.6 9.5C2.2 10.3 2 11.2 2 12v7h2v-7c0-.5.1-.9.2-1.4L5 7.2 4 6z" opacity="0.5"/>
                        </svg>
                        <span className="text-sm font-bold text-gray-900">{topic.cardCount} cards</span>
                      </div>
                    </div>
                  )}

                  {/* Topic Info */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-[#4A7FDB] transition-colors flex-1 capitalize" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {topic.name}
                    </h2>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-[#4A7FDB] text-white px-6 py-3.5 rounded-xl font-bold text-center group-hover:bg-[#3D6AC4] transition-all shadow-md group-hover:shadow-lg text-base flex items-center justify-center gap-2">
                        Play Now
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const shareUrl = `${window.location.origin}/${topic.id}`;
                          if (navigator.share) {
                            navigator.share({
                              title: `Deck Dash - ${topic.name}`,
                              text: `Can you recognize all ${topic.cardCount} cards? Try this quiz!`,
                              url: shareUrl,
                            }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                            alert('Link copied to clipboard!');
                          }
                        }}
                        className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white px-4 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                        title="Share this deck"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        </div>
      </div>

      {/* Professional Footer */}
      <footer className="bg-[#3D6AC4] border-t-4 border-[#FFD93D]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div>
              <h3 className="text-3xl font-black text-white mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                DECK DASH
              </h3>
              <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                The fun, fast-paced way to learn and memorize anything. Build your knowledge one card at a time.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Quick Links
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/request" className="text-white/80 hover:text-white transition-colors text-sm">
                    Request New Deck
                  </Link>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                About
              </h4>
              <p className="text-white/80 text-sm leading-relaxed">
                Powered by AI and community contributions. Images sourced from Wikipedia under Creative Commons licenses.
              </p>
            </div>
          </div>

          {/* Fine Print */}
          <div className="border-t border-white/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/60 text-xs">
              <p style={{ fontFamily: "'DM Sans', sans-serif" }}>
                © {new Date().getFullYear()} Deck Dash. All rights reserved.
              </p>
              <div className="flex flex-wrap gap-6">
                <button className="hover:text-white transition-colors">Privacy Policy</button>
                <button className="hover:text-white transition-colors">Terms of Service</button>
                <button className="hover:text-white transition-colors">Contact</button>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-4 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              This application uses images from Wikimedia Commons. All images are used under their respective Creative Commons licenses.
              Music generated by <a href="https://mubert.com/render" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60 transition-colors">Mubert</a>.
              Deck Dash is an educational tool and is not affiliated with any content creators or franchises depicted.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.8s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
