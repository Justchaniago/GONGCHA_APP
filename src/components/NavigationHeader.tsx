import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colorTokens';

// ==========================================
// 1. BACK BUTTON COMPONENT
// ==========================================
interface BackButtonProps {
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  color = colors.text.primary,
  style 
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.backBtn, style]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Kembali"
    >
      <ChevronLeft size={24} color={color} strokeWidth={2.5} />
    </TouchableOpacity>
  );
};

// ==========================================
// 2. NEXT / ACTION BUTTON COMPONENT
// ==========================================
interface ActionButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  showArrow?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  showArrow = false,
  style,
  textStyle
}) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  let buttonBg = colors.brand.primary;
  let textColor = colors.text.inverse;
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    buttonBg = '#2A1F1F';
  } else if (isOutline) {
    buttonBg = 'transparent';
    textColor = colors.brand.primary;
    borderColor = colors.brand.primary;
  }

  if (disabled) {
    buttonBg = colors.border.medium;
    textColor = colors.text.tertiary;
    borderColor = 'transparent';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.actionButton,
        { 
          backgroundColor: buttonBg, 
          borderColor: borderColor, 
          borderWidth: isOutline ? 1.5 : 0 
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.actionBtnContent}>
          <Text style={[styles.actionBtnText, { color: textColor }, textStyle]}>
            {title}
          </Text>
          {showArrow && !disabled && (
            <ArrowRight size={16} color={textColor} style={styles.actionBtnArrow} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ==========================================
// 3. NAVIGATION HEADER COMPONENT
// ==========================================
interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  variant?: 'light' | 'brand';
  style?: ViewStyle;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightElement,
  variant = 'light',
  style
}) => {
  const insets = useSafeAreaInsets();
  const isBrand = variant === 'brand';

  const bgColor = isBrand ? colors.brand.primary : colors.background.primary;
  const titleColor = isBrand ? colors.text.inverse : colors.text.primary;
  const subtitleColor = isBrand ? 'rgba(255, 255, 255, 0.8)' : colors.text.secondary;
  const backIconColor = isBrand ? colors.text.inverse : colors.text.primary;

  return (
    <View 
      style={[
        styles.headerContainer, 
        { 
          backgroundColor: bgColor,
          paddingTop: insets.top + 8,
          borderBottomWidth: isBrand ? 0 : 1,
          borderBottomColor: colors.border.light
        },
        style
      ]}
    >
      <View style={styles.headerContentRow}>
        {onBack && (
          <BackButton onPress={onBack} color={backIconColor} style={styles.leftBtnOffset} />
        )}
        
        <View style={[styles.titleContainer, !onBack && styles.noBackOffset]}>
          <Text style={[styles.headerTitle, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.headerSubtitle, { color: subtitleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightElement && (
          <View style={styles.rightElementContainer}>
            {rightElement}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Back button styles
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  leftBtnOffset: {
    marginRight: 8,
    marginLeft: -4,
  },

  // Action Button styles
  actionButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionBtnArrow: {
    marginLeft: 8,
  },

  // Navigation Header styles
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 10,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  noBackOffset: {
    paddingLeft: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  rightElementContainer: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
