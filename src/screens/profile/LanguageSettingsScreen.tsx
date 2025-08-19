import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../i18n/LanguageContext';
import { Colors } from '../../constants/Colors';
import LanguageSelector from '../../components/common/LanguageSelector';

const LanguageSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { currentLanguage, availableLanguages } = useLanguage();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const getCurrentLanguageName = () => {
    const language = availableLanguages.find(lang => lang.code === currentLanguage);
    return language ? language.nativeName : currentLanguage.toUpperCase();
  };

  const handleLanguagePress = () => {
    setShowLanguageSelector(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.language')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          <Text style={styles.sectionDescription}>
            {t('profile.languageDescription')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.languageCard}
          onPress={handleLanguagePress}
        >
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>{getCurrentLanguageName()}</Text>
            <Text style={styles.languageCode}>{currentLanguage.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('profile.languageNote')}</Text>
              <Text style={styles.infoText}>
                {t('profile.languageNoteText')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.availableLanguagesSection}>
          <Text style={styles.sectionTitle}>{t('profile.availableLanguages')}</Text>
          {availableLanguages.map((language) => (
            <View key={language.code} style={styles.languageItem}>
              <View style={styles.languageItemInfo}>
                <Text style={styles.languageItemName}>{language.nativeName}</Text>
                <Text style={styles.languageItemEnglish}>{language.name}</Text>
              </View>
              {currentLanguage === language.code && (
                <View style={styles.currentIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  <Text style={styles.currentText}>{t('common.current')}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  languageCode: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoSection: {
    marginBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    padding: 15,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  availableLanguagesSection: {
    marginBottom: 30,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  languageItemInfo: {
    flex: 1,
  },
  languageItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  languageItemEnglish: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default LanguageSettingsScreen;
