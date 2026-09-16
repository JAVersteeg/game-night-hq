import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';

// Inter is the app's only font — applied here as a default style rather than via
// RN's Text.defaultProps, which React 19 deprecates (and warns about) for function components.
const DEFAULT_FONT_STYLE = { fontFamily: 'Inter_500Medium' };

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  return <RNText ref={ref} style={[DEFAULT_FONT_STYLE, style]} {...props} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { style, ...props },
  ref,
) {
  return <RNTextInput ref={ref} style={[DEFAULT_FONT_STYLE, style]} {...props} />;
});
