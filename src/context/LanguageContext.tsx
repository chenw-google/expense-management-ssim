import { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Language, Translation } from '../i18n/translations';

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'));

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
