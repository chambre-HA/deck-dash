'use client';

import { useState, useEffect } from 'react';

const VIBEUNCLE_PROJECT_ID = 'deck-dash';
const VIBEUNCLE_API_BASE = 'https://api.vibeuncle.com/webhook';
const VIBEUNCLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvN4ywySe7KwWLKUyq5E8YHgshEVVMGsib31Kk-eCazw56A950fKPxX4Y6-qV1CnGx9laEeSBfjBOo/pub?gid=0&single=true&output=csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseVibeUncleCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || '';
    });
    return obj;
  });
}

// Deck Dash Logo Component
const DeckDashLogo = ({ size = 32, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 523.05 541.92" fill="currentColor">
    <path fill="#ef4444" d="M456.84,491.26c-6.55,34.33-38.2,55.91-72.42,49.56l-289.56-53.77c-14.32-2.66-26.62,1.46-41.83-.41C27.69,483.53,0,461.15,0,432.64L.07,54.77C.07,22.9,31.74-.56,61.54.01l267,.06c35.32,0,62.1,29.54,60.87,64.49l85.03,15.29c31.38,5.64,51.3,34.54,48.32,66.22l-65.9,345.19ZM328.61,438.59c6.83-1.38,11.9-5.22,11.9-12.15V60.99c0-6.07-3.96-10.07-9.13-12.27l-272.49.05c-6.51,0-10.67,6.26-10.67,12.14v364.62c0,7.42,4.69,11.94,11.85,13.06h268.55ZM409.36,479.72l64.57-337.61c.76-7.3-2.55-13.77-9.75-15.01l-74.67-12.88-.17,312.22c-.01,26.43-16.91,47.36-41.38,57.59l43.83,8.56c4.57.89,8.71.95,12.35-1.85,3.23-2.49,4.17-5.52,5.22-11.03Z"/>
    <path fill="#fff" d="M328.61,438.59H60.06c-7.16-1.13-11.85-5.64-11.85-13.06V60.91c0-5.88,4.16-12.14,10.67-12.14l272.49-.05c5.17,2.2,9.14,6.2,9.14,12.27v365.45c0,6.93-5.07,10.77-11.9,12.15ZM174.4,328.32l13.77,24.85c2.37,4.27,7.4,6.87,12.23,7.03,3.88.13,9.63-2.36,11.83-6.94l56.23-117.16,38.5,16.98c4.65,2.05,10.27.72,13.71-2.62,2.88-2.8,5.95-7.46,4.59-12.71l-26.98-104.54c-1.99-7.72-6.91-13.54-12.51-16.54-7.99-4.28-14.9-3.35-22.9-.77l-120,38.78c-6.26,2.02-7.73,9.14-7.48,14.35s3.94,9.3,9.21,11.61l20.19,8.83c3.16,1.38,6.01,2.31,8.32,5.64l-100.89,128.89c-7.81,9.98-3.74,23.96,4.05,31.3,9.17,8.65,20.68,8.14,31.54,2.49l61.08-31.76c2.08-1.08,4.39.27,5.5,2.28ZM97.87,242.22c8.35-7.48,15.55-15.22,23.3-22.94,6.76-6.73,8.17-17.16,1.75-24.32-5.95-6.64-16.99-7.62-23.97-.63l-23.72,23.73c-6.32,6.33-5.62,16.87-.06,22.77s15.9,7.48,22.7,1.39Z"/>
    <path fill="#fff" d="M409.36,479.72c-1.05,5.51-1.98,8.54-5.22,11.03-3.64,2.8-7.78,2.74-12.35,1.85l-43.83-8.56c24.46-10.23,41.36-31.16,41.38-57.59l.17-312.22,74.67,12.88c7.21,1.24,10.52,7.71,9.75,15.01l-64.57,337.61Z"/>
    <path fill="#ef4444" d="M174.4,328.32c-1.11-2.01-3.41-3.36-5.5-2.28l-61.08,31.76c-10.86,5.65-22.37,6.15-31.54-2.49-7.79-7.35-11.86-21.33-4.05-31.3l100.89-128.89c-2.3-3.33-5.16-4.26-8.32-5.64l-20.19-8.83c-5.27-2.31-8.96-6.59-9.21-11.61s1.22-12.33,7.48-14.35l120-38.78c8-2.58,14.91-3.51,22.9.77,5.6,3,10.52,8.83,12.51,16.54l26.98,104.54c1.35,5.25-1.71,9.91-4.59,12.71-3.44,3.34-9.05,4.67-13.71,2.62l-38.5-16.98-56.23,117.16c-2.2,4.58-7.95,7.07-11.83,6.94-4.84-.16-9.87-2.75-12.23-7.03l-13.77-24.85Z"/>
    <path fill="#ef4444" d="M97.87,242.22c-6.8,6.09-17.31,4.32-22.7-1.39s-6.26-16.44.06-22.77l23.72-23.73c6.98-6.99,18.02-6.01,23.97.63,6.42,7.16,5.01,17.59-1.75,24.32-7.75,7.72-14.95,15.46-23.3,22.94Z"/>
  </svg>
);

export function VibeUncleHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasLiked(localStorage.getItem(`vibeuncle_liked_${VIBEUNCLE_PROJECT_ID}`) === 'true');

    // Fetch stats
    fetch(VIBEUNCLE_SHEET_URL)
      .then(res => res.text())
      .then(text => {
        const data = parseVibeUncleCSV(text);
        const project = data.find(p => p.id === VIBEUNCLE_PROJECT_ID || p.icon_url?.includes('deck-dash'));
        if (project) {
          setLikes(parseInt(project.likes) || 0);
          setViews(parseInt(project.views) || 0);
        }
      })
      .catch(err => console.error('Error fetching stats:', err));

    // Track view
    const viewKey = `vibeuncle_viewed_${VIBEUNCLE_PROJECT_ID}`;
    if (!sessionStorage.getItem(viewKey)) {
      setViews(prev => prev + 1);
      fetch(`${VIBEUNCLE_API_BASE}/vibeuncle-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: VIBEUNCLE_PROJECT_ID, action: 'view', timestamp: new Date().toISOString() })
      }).catch(err => console.error('Error sending view:', err));
      sessionStorage.setItem(viewKey, 'true');
    }
  }, []);

  // Expose toggle function globally for the logo to call
  useEffect(() => {
    (window as unknown as { toggleVibeUncleBar?: () => void }).toggleVibeUncleBar = () => setIsOpen(prev => !prev);
    return () => {
      delete (window as unknown as { toggleVibeUncleBar?: () => void }).toggleVibeUncleBar;
    };
  }, []);

  const handleLike = () => {
    if (hasLiked) return;
    setLikes(prev => prev + 1);
    setHasLiked(true);
    localStorage.setItem(`vibeuncle_liked_${VIBEUNCLE_PROJECT_ID}`, 'true');
    fetch(`${VIBEUNCLE_API_BASE}/vibeuncle-like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: VIBEUNCLE_PROJECT_ID, action: 'like', timestamp: new Date().toISOString() })
    }).catch(err => console.error('Error sending like:', err));
  };

  const handleShare = async () => {
    const shareData = { title: 'Deck Dash', text: 'See the picture, pick the answer. Race against time!', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <>

      {/* Top Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-[200] overflow-hidden shadow-lg transition-all duration-300 ease-out ${
          isOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <a
            href="https://vibeuncle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-bold text-xs tracking-wide hover:underline leading-tight"
          >
            MADE BY<br />VIBEUNCLE.COM
          </a>
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-transform ${hasLiked ? 'cursor-default' : 'hover:scale-110'}`}
            >
              <svg className="w-5 h-5" fill={hasLiked ? 'white' : 'none'} stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              {mounted && <span className="text-white font-bold text-lg">{likes}</span>}
            </button>
            {/* View Counter */}
            <div className="flex items-center gap-1.5">
              <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              {mounted && <span className="text-white font-bold text-lg">{views}</span>}
            </div>
            {/* Share Button */}
            <button onClick={handleShare} className="p-1 hover:bg-white/20 rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>
            {/* Close Button */}
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded transition-colors ml-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer when bar is open */}
      <div className={`transition-all duration-300 ease-out ${isOpen ? 'h-[52px]' : 'h-0'}`} />
    </>
  );
}
