'use client';

import CodeBlock from './CodeBlock';
import type { Language, CodeExample } from '../data/code-examples';

const labels: Record<Language, string> = {
  curl: 'cURL',
  javascript: 'JavaScript',
  python: 'Python',
};

interface CodeTabsProps {
  examples: CodeExample;
  activeLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function CodeTabs({ examples, activeLanguage, onLanguageChange }: CodeTabsProps) {
  const languages: Language[] = ['curl', 'javascript', 'python'];

  return (
    <div>
      <div className="flex border-b border-zinc-800">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeLanguage === lang
                ? 'border-b-2 border-blue-400 text-blue-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {labels[lang]}
          </button>
        ))}
      </div>
      <CodeBlock code={examples[activeLanguage]} language={labels[activeLanguage]} />
    </div>
  );
}
