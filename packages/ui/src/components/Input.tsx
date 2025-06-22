/**
 * Input Components - Modular and focused input components
 *
 * This file now re-exports the focused components for backward compatibility
 * while maintaining the improved architecture.
 */

import * as React from 'react';
import { InputField, type InputFieldProps } from './InputField';
import { TextareaField, type TextareaFieldProps } from './TextareaField';
import { InputBase } from './InputBase';
import { inputVariants } from './InputBase';

// Backward compatibility exports
export interface InputProps extends InputFieldProps {}

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <InputField {...props} ref={ref} />;
});
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>((props, ref) => {
  return <TextareaField {...props} ref={ref} />;
});
Textarea.displayName = 'Textarea';

// Export all components and utilities
export { Input, Textarea, InputField, TextareaField, InputBase, inputVariants };
