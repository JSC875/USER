import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  availableLanguages: Array<{ code: string; name: string; nativeName: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'selected_language';

const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    // Load saved language on app start
    loadSavedLanguage();
  }, []);

  // Update i18n language when currentLanguage changes
  useEffect(() => {
    if (currentLanguage && i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage) {
        await changeLanguage(savedLanguage);
      } else {
        // Use device language if no saved preference
        const deviceLanguage = i18n.language || 'en';
        const supportedLanguage = availableLanguages.find(lang => 
          lang.code === deviceLanguage || deviceLanguage.startsWith(lang.code)
        );
        if (supportedLanguage) {
          await changeLanguage(supportedLanguage.code);
        }
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
      // Fallback to English
      await changeLanguage('en');
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      // Update the state first
      setCurrentLanguage(language);
      
      // Save to storage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      
      console.log('Language changed successfully to:', language);
    } catch (error) {
      console.error('Error changing language:', error);
      throw error; // Re-throw the error so the calling component can handle it
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
