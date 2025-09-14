import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { PopularPlace, getPlacesByCategory, getCategoryIcon, getCategoryColor } from '../../constants/HyderabadPopularPlaces';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

// Professional categories only
type ProfessionalCategory = 'business' | 'transport' | 'healthcare' | 'education' | 'shopping' | 'entertainment';

interface CategorizedLocationListProps {
  onLocationSelect: (location: PopularPlace) => void;
  showAllCategories?: boolean;
  maxItemsPerCategory?: number;
}

const CATEGORY_ORDER: ProfessionalCategory[] = [
  'business',
  'transport',
  'healthcare',
  'education',
  'shopping',
  'entertainment',
];

const CATEGORY_LABELS: Record<ProfessionalCategory, string> = {
  business: 'Business & IT',
  transport: 'Transport',
  healthcare: 'Healthcare',
  education: 'Education',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
};

export default function CategorizedLocationList({ 
  onLocationSelect, 
  showAllCategories = false,
  maxItemsPerCategory = 3 
}: CategorizedLocationListProps) {
  
  const [expandedCategories, setExpandedCategories] = useState<Set<ProfessionalCategory>>(
    new Set(['business']) // Show only the first category expanded by default
  );
  
  const toggleCategory = (category: ProfessionalCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const renderLocationItem = ({ item }: { item: PopularPlace }) => (
    <TouchableOpacity 
      style={styles.locationItem} 
      onPress={() => onLocationSelect(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
        <Text style={styles.categoryIcon}>{getCategoryIcon(item.category)}</Text>
      </View>
      <View style={styles.locationInfo}>
        <Text style={styles.locationName}>{item.name}</Text>
        <Text style={styles.locationAddress} numberOfLines={1}>{item.address}</Text>
        {item.subcategory && (
          <Text style={[styles.subcategory, { color: getCategoryColor(item.category) }]}>
            {item.subcategory}
          </Text>
        )}
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (category: ProfessionalCategory) => {
    const places = getPlacesByCategory(category);
    const isExpanded = expandedCategories.has(category);
    const displayPlaces = showAllCategories ? places : places.slice(0, maxItemsPerCategory);
    
    if (displayPlaces.length === 0) return null;

    return (
      <View key={category} style={styles.categorySection}>
        <TouchableOpacity 
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category)}
          activeOpacity={0.7}
        >
          <View style={[styles.categoryIconLarge, { backgroundColor: getCategoryColor(category) + '20' }]}>
            <Text style={styles.categoryIconText}>{getCategoryIcon(category)}</Text>
          </View>
          <Text style={styles.categoryTitle}>{CATEGORY_LABELS[category]}</Text>
          <Text style={styles.categoryCount}>({displayPlaces.length})</Text>
          <View style={styles.expandIcon}>
            <Text style={[styles.expandIconText, { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }]}>
              ▼
            </Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <FlatList
            data={displayPlaces}
            keyExtractor={(item) => item.id}
            renderItem={renderLocationItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Layout.spacing.lg }} />}
          />
        )}
      </View>
    );
  };

  const categoriesToShow = showAllCategories ? CATEGORY_ORDER : CATEGORY_ORDER.slice(0, 4);

  // Get most popular places for quick access
  const getQuickAccessPlaces = () => {
    const quickPlaces: PopularPlace[] = [];
    const categories: ProfessionalCategory[] = ['business', 'transport', 'healthcare'];
    
    categories.forEach(category => {
      const places = getPlacesByCategory(category);
      quickPlaces.push(...places.slice(0, 2)); // Top 2 from each category
    });
    
    return quickPlaces.slice(0, 6); // Limit to 6 total
  };

  const renderQuickAccessSection = () => {
    const quickPlaces = getQuickAccessPlaces();
    
    return (
      <View style={styles.quickAccessSection}>
        <Text style={styles.quickAccessTitle}>Popular Destinations</Text>
        <View style={styles.quickAccessGrid}>
          {quickPlaces.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.quickAccessItem}
              onPress={() => onLocationSelect(place)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: getCategoryColor(place.category) + '20' }]}>
                <Text style={styles.quickAccessIconText}>{getCategoryIcon(place.category)}</Text>
              </View>
              <Text style={styles.quickAccessName} numberOfLines={1}>{place.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {renderQuickAccessSection()}
      {categoriesToShow.map(renderCategorySection)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  quickAccessSection: {
    marginBottom: 24,
    paddingHorizontal: Layout.spacing.lg,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAccessItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quickAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessIconText: {
    fontSize: 18,
  },
  quickAccessName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d2d2d',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
    marginBottom: 0,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  categoryIconLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  expandIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  expandIconText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 18,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  subcategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 18,
    color: '#999999',
    fontWeight: '300',
  },
});
