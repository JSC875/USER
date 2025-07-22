import React from 'react';
import { Image, ImageStyle } from 'react-native';
import { Images } from '../../constants/Images';

interface LogoProps {
  size?: number;
  style?: ImageStyle;
  variant?: 'default' | 'white' | 'black' | 'blue' | 'green';
}

export default function Logo({ size = 100, style, variant = 'default' }: LogoProps) {
  const getLogoSource = () => {
    switch (variant) {
      case 'white':
        return Images.APPACELLA_LOGO_WHITE;
      case 'black':
        return Images.APPACELLA_LOGO_BLACK;
      case 'blue':
        return Images.APPACELLA_LOGO_BLUE;
      case 'green':
        return Images.APPACELLA_LOGO_GREEN;
      default:
        return Images.LOGO; // This is roqetlogo.jpg
    }
  };

  return (
    <Image
      source={getLogoSource()}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
} 