import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../i18n/LanguageContext';

export default function SettingsScreen({ navigation }: any) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [autoPayment, setAutoPayment] = useState(false);
  const [shareData, setShareData] = useState(true);

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user?.firstName) {
      return user.firstName;
    } else if (user?.fullName) {
      return user.fullName;
    }
    return 'User';
  };

  const getUserEmail = () => {
    return user?.primaryEmailAddress?.emailAddress || '';
  };

  const getUserPhone = () => {
    return user?.primaryPhoneNumber?.phoneNumber || '';
  };

  const getUserPhoto = () => {
    return user?.imageUrl || '';
  };

  const getCurrentLanguageName = () => {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'hi': 'हिंदी',
      'ar': 'العربية'
    };
    return languageMap[currentLanguage] || currentLanguage.toUpperCase();
  };

  const settingSections = [
    {
      title: t('profile.account', 'Account'),
      items: [
        {
          icon: 'person-outline',
          title: t('common.personalInformation'),
          subtitle: t('common.updateProfileDetails'),
          action: () => navigation.navigate('PersonalDetails', {
            name: getUserName(),
            email: getUserEmail(),
            phone: getUserPhone(),
            gender: '',
            emergencyName: '',
            emergencyPhone: '',
            photo: getUserPhoto(),
          }),
        },
        {
          icon: 'shield-checkmark-outline',
          title: t('common.privacySecurity'),
          subtitle: t('common.managePrivacySettings'),
          action: () => navigation.navigate('PrivacySecurity'),
        },
        
      ],
    },
    {
      title: t('profile.preferences', 'Preferences'),
      items: [
        {
          icon: 'language-outline',
          title: t('profile.language'),
          subtitle: `Current: ${getCurrentLanguageName()}`,
          action: () => navigation.navigate('LanguageSettings'),
        },
        {
          icon: 'notifications-outline',
          title: t('common.pushNotifications'),
          subtitle: t('common.receiveRideUpdates'),
          toggle: true,
          value: notifications,
          onToggle: setNotifications,
        },
        {
          icon: 'location-outline',
          title: t('common.locationServices'),
          subtitle: t('common.allowLocationAccess'),
          toggle: true,
          value: locationServices,
          onToggle: setLocationServices,
        },
        {
          icon: 'card-outline',
          title: t('common.autoPayment'),
          subtitle: t('common.automaticallyPayForRides'),
          toggle: true,
          value: autoPayment,
          onToggle: setAutoPayment,
        },
      ],
    },
    {
      title: t('support.helpSupport', 'Support'),
      items: [
        {
          icon: 'help-circle-outline',
          title: t('common.helpCenter'),
          subtitle: t('common.getHelpWithAccount'),
          action: () => console.log('Help Center'),
        },
        {
          icon: 'chatbubble-outline',
          title: t('common.contactSupport'),
          subtitle: t('common.chatWithSupportTeam'),
          action: () => console.log('Contact Support'),
        },
        {
          icon: 'star-outline',
          title: t('common.rateApp'),
          subtitle: t('common.shareYourFeedback'),
          action: () => console.log('Rate App'),
        },
      ],
    },
    {
      title: t('profile.legal', 'Legal'),
      items: [
        {
          icon: 'document-text-outline',
          title: t('common.termsOfService'),
          subtitle: t('common.readTermsAndConditions'),
          action: () => console.log('Terms'),
        },
        {
          icon: 'shield-outline',
          title: t('common.privacyPolicy'),
          subtitle: t('common.learnHowWeProtectData'),
          action: () => console.log('Privacy Policy'),
        },
        {
          icon: 'share-outline',
          title: t('common.dataSharing'),
          subtitle: t('common.controlDataSharing'),
          toggle: true,
          value: shareData,
          onToggle: setShareData,
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.settingItem}
      onPress={item.action}
      disabled={item.toggle}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={item.icon} size={20} color={Colors.gray600} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.toggle ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: Colors.gray300, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('navigation.settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* Bottom Margin */}
        <View style={styles.bottomMargin} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
    marginHorizontal: Layout.spacing.lg,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingRight: {
    marginLeft: Layout.spacing.md,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  appVersion: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  appBuild: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textLight,
    marginTop: Layout.spacing.xs,
  },
  bottomMargin: {
    height: Layout.spacing.xl,
  },
});
