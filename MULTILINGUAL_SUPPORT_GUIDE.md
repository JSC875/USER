# Multilingual Support Guide

This guide explains how to use the multilingual support system implemented in your React Native app.

## Overview

The app now supports multiple languages using `react-i18next`. The system includes:

- **5 Languages**: English, Spanish, French, Hindi, and Arabic
- **Automatic Language Detection**: Detects device language on first launch
- **Persistent Language Selection**: Remembers user's language choice
- **Easy Language Switching**: In-app language selector
- **Comprehensive Translations**: Covers all major app sections

## File Structure

```
src/i18n/
├── index.ts                 # Main i18n configuration
├── LanguageContext.tsx      # Language context and provider
└── locales/
    ├── en.json             # English translations
    ├── es.json             # Spanish translations
    ├── fr.json             # French translations
    ├── hi.json             # Hindi translations
    └── ar.json             # Arabic translations

src/components/common/
└── LanguageSelector.tsx    # Language selection modal

src/screens/profile/
└── LanguageSettingsScreen.tsx  # Language settings screen
```

## How to Use

### 1. Basic Translation Usage

In any component, import and use the translation hook:

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('common.loading')}</Text>
  );
}
```

### 2. Nested Translation Keys

Use dot notation for nested keys:

```typescript
// For ride.cancelReasons.foundAnotherRide
<Text>{t('ride.cancelReasons.foundAnotherRide')}</Text>
```

### 3. Language Switching

Use the language context to change languages:

```typescript
import { useLanguage } from '../i18n/LanguageContext';

function LanguageSwitcher() {
  const { changeLanguage, currentLanguage } = useLanguage();
  
  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
  };
  
  return (
    <TouchableOpacity onPress={() => handleLanguageChange('es')}>
      <Text>Switch to Spanish</Text>
    </TouchableOpacity>
  );
}
```

### 4. Language Settings Screen

Navigate to the language settings screen:

```typescript
navigation.navigate('LanguageSettings');
```

## Adding New Languages

### 1. Create Translation File

Create a new JSON file in `src/i18n/locales/`:

```json
// src/i18n/locales/de.json (German example)
{
  "common": {
    "loading": "Laden...",
    "error": "Fehler",
    "success": "Erfolg"
  }
}
```

### 2. Update i18n Configuration

Add the new language to `src/i18n/index.ts`:

```typescript
import de from './locales/de.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  hi: { translation: hi },
  ar: { translation: ar },
  de: { translation: de }, // Add new language
};
```

### 3. Update Language Context

Add the language to `src/i18n/LanguageContext.tsx`:

```typescript
const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' }, // Add new language
];
```

## Adding New Translation Keys

### 1. Add to All Language Files

Add the new key to all language files:

```json
// In en.json
{
  "newSection": {
    "newKey": "New English Text"
  }
}

// In es.json
{
  "newSection": {
    "newKey": "Nuevo Texto en Español"
  }
}
```

### 2. Use in Components

```typescript
const { t } = useTranslation();
<Text>{t('newSection.newKey')}</Text>
```

## Best Practices

### 1. Key Naming Convention

Use descriptive, hierarchical keys:

```typescript
// Good
t('ride.cancelReasons.foundAnotherRide')
t('profile.personalDetails.firstName')

// Avoid
t('text1')
t('cancel')
```

### 2. Fallback Values

Provide fallback values for missing translations:

```typescript
t('newKey', 'Fallback text if translation is missing')
```

### 3. Pluralization

For plural forms, use i18next's pluralization:

```typescript
// In translation file
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}

// In component
t('items', { count: 5 }) // "5 items"
```

### 4. Interpolation

Use interpolation for dynamic values:

```typescript
// In translation file
{
  "welcome": "Welcome, {{name}}!"
}

// In component
t('welcome', { name: 'John' }) // "Welcome, John!"
```

## RTL Support

The system automatically handles RTL (Right-to-Left) languages like Arabic. The app will:

- Automatically adjust text alignment
- Flip layout direction
- Handle RTL text input

## Testing

### 1. Test All Languages

Switch between all supported languages to ensure:

- All text is translated
- No missing translation keys
- Proper text alignment (especially RTL)
- No layout issues

### 2. Test Language Persistence

- Change language
- Restart app
- Verify language preference is maintained

### 3. Test Device Language Detection

- Change device language
- Install fresh app
- Verify correct language is detected

## Troubleshooting

### Common Issues

1. **Missing Translation Key**
   - Check if key exists in all language files
   - Use fallback value: `t('key', 'Fallback')`

2. **Language Not Changing**
   - Ensure `LanguageProvider` wraps your app
   - Check AsyncStorage permissions
   - Verify language code is correct

3. **RTL Layout Issues**
   - Test with Arabic language
   - Check text alignment
   - Verify layout direction

### Debug Mode

Enable debug mode in `src/i18n/index.ts`:

```typescript
i18n.init({
  debug: true, // Shows missing translations in console
  // ... other config
});
```

## Performance Considerations

- Translation files are loaded on app start
- Language switching is instant
- No performance impact during normal usage
- AsyncStorage operations are minimal

## Future Enhancements

Potential improvements:

1. **Dynamic Translation Loading**: Load translations on-demand
2. **Translation Management**: Admin panel for managing translations
3. **Auto-translation**: Integration with translation APIs
4. **Voice Support**: Text-to-speech in different languages
5. **Regional Variants**: Support for regional language variants (e.g., en-US, en-GB)

## Support

For issues or questions about the multilingual system:

1. Check this guide first
2. Review the translation files
3. Test with different languages
4. Check console for debug information
