import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';

interface ProductCardProps {
  product: {
    name: string;
    price_range: string;
    affiliate_url: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const handlePress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(product.affiliate_url);
      if (canOpen) {
        await Linking.openURL(product.affiliate_url);
      } else {
        Alert.alert(
          'Error',
          'Cannot open the link at this time. Please check your internet connection.'
        );
      }
    } catch (error) {
      console.error('An error occurred opening the link:', error);
      Alert.alert(
        'Error',
        'Cannot open the link at this time. Please check your internet connection.'
      );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>
          {product.price_range}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Buy on Shopee</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Elevation for Android
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    marginBottom: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#2e7d32', // Green for price
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#EE4D2D', // Shopee Orange
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
