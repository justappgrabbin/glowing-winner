'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface CharacterCreatorProps {
  onCharacterCreated: (avatarUrl: string) => void;
  onClose: () => void;
  cosmicColors?: string[];
}

interface RPMEvent {
  source: string;
  eventName: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

export function CharacterCreator({ onCharacterCreated, onClose, cosmicColors }: CharacterCreatorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Memoized parse function to avoid recreating on every render
  const parseEventData = useCallback((data: string): RPMEvent | null => {
    try {
      return JSON.parse(data) as RPMEvent;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin if possible (ReadyPlayerMe uses various subdomains)
      // For demo.readyplayer.me, we accept messages from that domain
      if (event.origin !== 'https://demo.readyplayer.me' && !event.origin.includes('readyplayer.me')) {
        return;
      }

      const json = parseEventData(event.data);

      if (json?.source !== 'readyplayerme') {
        return;
      }

      if (json.eventName === 'v1.frame.ready') {
        setIsLoading(false);

        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              target: 'readyplayerme',
              type: 'subscribe',
              eventName: 'v1.**'
            }),
            'https://demo.readyplayer.me'
          );
        }
      }

      if (json.eventName === 'v1.avatar.exported' && json.data?.url) {
        console.log(`Avatar exported: ${json.data.url}`);
        onCharacterCreated(json.data.url);
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCharacterCreated, onClose, parseEventData]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-3xl max-h-[80vh] bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-red-500/90 hover:bg-red-600 rounded-full transition-colors shadow-lg"
          aria-label="Close character creator"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {cosmicColors && cosmicColors.length > 0 && (
          <div className="absolute top-16 left-4 z-10 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-purple-500/50">
            <div className="text-sm text-white/80 mb-2">✨ Your Cosmic Colors:</div>
            <div className="flex gap-2 flex-wrap max-w-[200px]">
              {cosmicColors.map((color, i) => (
                <div key={`${color}-${i}`} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <div className="text-xs text-white/60 font-mono">{color}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <div className="text-white text-lg font-medium">Loading Character Creator...</div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="https://demo.readyplayer.me/avatar?frameApi"
          className="w-full h-full border-0"
          allow="camera *; microphone *"
          title="Ready Player Me Character Creator"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
