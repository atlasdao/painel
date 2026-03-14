'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';

// BIP39 English wordlist (2048 words) - loaded lazily
let cachedWordlist: string[] | null = null;

async function getWordlist(): Promise<string[]> {
  if (cachedWordlist) return cachedWordlist;
  try {
    const bip39 = await import('bip39');
    cachedWordlist = bip39.wordlists.english;
  } catch {
    cachedWordlist = [];
  }
  return cachedWordlist;
}

interface Bip39InputProps {
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  onTab?: (index: number) => void;
}

function Bip39InputInner({ index, value, onChange, onTab }: Bip39InputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSuggestions = useCallback(async (text: string) => {
    const trimmed = text.trim().toLowerCase();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const wordlist = await getWordlist();
    const matches = wordlist
      .filter(w => w.startsWith(trimmed))
      .slice(0, 5);

    setSuggestions(matches);
    setSelectedIdx(0);
    setShowSuggestions(matches.length > 0 && matches[0] !== trimmed);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Handle paste of full mnemonic
    if (val.includes(' ') && index === 0) {
      const words = val.trim().split(/\s+/);
      if (words.length === 12) {
        words.forEach((w, i) => onChange(i, w.toLowerCase()));
        setShowSuggestions(false);
        return;
      }
    }

    onChange(index, val.toLowerCase());
    updateSuggestions(val);
  };

  const selectSuggestion = useCallback((word: string) => {
    onChange(index, word);
    setShowSuggestions(false);
    setSuggestions([]);
    // Move to next input
    onTab?.(index);
  }, [index, onChange, onTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        onTab?.(index);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex items-center gap-1" ref={containerRef}>
      <span className="text-xs text-[var(--text-muted)] w-5 text-right">{index + 1}.</span>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="..."
          data-word-index={index}
          className="w-full px-2 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] min-w-0"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((word, i) => (
              <button
                key={word}
                onClick={() => selectSuggestion(word)}
                className={`w-full text-left px-2.5 py-1.5 text-sm font-mono transition-colors ${
                  i === selectedIdx
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span className="font-semibold">{value.trim().toLowerCase()}</span>
                <span className="text-[var(--text-muted)]">{word.slice(value.trim().length)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(Bip39InputInner);
