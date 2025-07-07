import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { mockPaymentMethods } from '../../data/mockData';

const paymentMethods = [
  {
    id: '1',
    type: 'UPI',
    label: 'GPay',
    icon: <MaterialCommunityIcons name="google" size={28} color="#4285F4" />,
    details: 'xxxxxx@okhdfcbank',
    isDefault: true,
  },
  {
    id: '2',
    type: 'Card',
    label: 'Visa',
    icon: <FontAwesome5 name="cc-visa" size={28} color="#1a1f71" />,
    details: '**** 1234',
    isDefault: false,
  },
  {
    id: '3',
    type: 'Wallet',
    label: 'Paytm',
    icon: <MaterialCommunityIcons name="wallet" size={28} color="#0f9d58" />,
    details: 'Wallet',
    isDefault: false,
  },
];

const paymentHistory = [
  {
    id: 'RIDE1234',
    date: '2024-06-01 14:30',
    amount: 120,
    method: 'GPay',
    status: 'Success',
  },
  {
    id: 'RIDE1233',
    date: '2024-05-30 18:10',
    amount: 95,
    method: 'Visa',
    status: 'Failed',
  },
  {
    id: 'RIDE1232',
    date: '2024-05-28 09:45',
    amount: 150,
    method: 'Paytm',
    status: 'Success',
  },
];

const statusColors = {
  Success: '#22c55e',
  Failed: '#ef4444',
};

export default function PaymentScreen({ navigation }: any) {
  const [coupon, setCoupon] = useState('');
  const [selected, setSelected] = useState('card');
  const price = 52;
  const [defaultMethod, setDefaultMethod] = useState('1');
  const [activeTab, setActiveTab] = useState<'methods' | 'history'>('methods');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Back button and illustration */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

     
      

      {/* Tab row */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'methods' && styles.tabBtnActive]}
          onPress={() => setActiveTab('methods')}
        >
          <Text style={[styles.tabText, activeTab === 'methods' && styles.tabTextActive]}>Payment Methods</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Payment History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'methods' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.methodRow}>
                <View style={styles.methodIcon}>{method.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={styles.methodDetails}>{method.details}</Text>
                </View>
                {defaultMethod === method.id ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setDefaultMethod(method.id)} style={styles.setDefaultBtn}>
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add New Payment Method</Text>
            </TouchableOpacity>
          </View>
          
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <FlatList
            data={paymentHistory}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Ionicons name="receipt-outline" size={24} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rideId}>{item.id}</Text>
                  <Text style={styles.historyDetails}>{item.date} • {item.method}</Text>
                </View>
                <Text style={styles.amount}>₹{item.amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status as keyof typeof statusColors] || '#a3a3a3' }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginLeft: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  applyCouponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  applyCouponText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    marginRight: 8,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22223b',
    marginBottom: 14,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  methodIcon: { marginRight: 14 },
  methodLabel: { fontSize: 16, fontWeight: '600', color: '#22223b' },
  methodDetails: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  defaultBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  defaultBadgeText: { color: '#6366f1', fontWeight: 'bold', fontSize: 12 },
  setDefaultBtn: { paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  setDefaultText: { color: '#6366f1', fontWeight: '600', fontSize: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 6 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  historyIcon: { marginRight: 12 },
  rideId: { fontSize: 15, fontWeight: '600', color: '#22223b' },
  historyDetails: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: 'bold', color: '#22223b', marginRight: 10 },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 4,
  },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  priceBox: {
    marginRight: 18,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.gray500,
    marginTop: -2,
  },
  bookBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#ececec',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 8,
    marginTop: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 16,
  },
  tabTextActive: {
    color: '#6366f1',
  },
}); 