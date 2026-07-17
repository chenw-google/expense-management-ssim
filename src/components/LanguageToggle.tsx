import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      aria-label="Toggle language between English and Chinese"
      className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5 text-xs font-medium shrink-0"
    >
      <span
        className={`px-2.5 py-1 rounded-full transition-colors ${
          language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-500'
        }`}
      >
        EN
      </span>
      <span
        className={`px-2.5 py-1 rounded-full transition-colors ${
          language === 'zh' ? 'bg-blue-600 text-white' : 'text-slate-500'
        }`}
      >
        中文
      </span>
    </button>
  );
}
