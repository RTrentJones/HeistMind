/**
 * Type-safe wrappers for Framer Motion components
 * Eliminates prop conflicts between HTML and Motion props
 */

import * as React from 'react';
import { motion, type MotionProps } from 'framer-motion';

// Safe motion div that accepts standard HTML props
export interface MotionDivProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    | 'onDrag'
    | 'onDragEnd'
    | 'onDragStart'
    | 'onDragEnter'
    | 'onDragExit'
    | 'onDragLeave'
    | 'onDragOver'
    | 'onDrop'
    | 'onAnimationStart'
    | 'onAnimationEnd'
  > {
  // Motion-specific props with safe defaults
  initial?: MotionProps['initial'];
  animate?: MotionProps['animate'];
  exit?: MotionProps['exit'];
  transition?: MotionProps['transition'];
  whileHover?: MotionProps['whileHover'];
  whileTap?: MotionProps['whileTap'];
  whileFocus?: MotionProps['whileFocus'];
}

export const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ initial, animate, exit, transition, whileHover, whileTap, whileFocus, ...htmlProps }, ref) => {
    const motionProps = {
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileFocus,
    };

    // Remove undefined values to prevent passing undefined to Framer Motion
    const cleanMotionProps = Object.fromEntries(
      Object.entries(motionProps).filter(([, value]) => value !== undefined)
    );

    return <motion.div ref={ref} {...htmlProps} {...cleanMotionProps} />;
  }
);
MotionDiv.displayName = 'MotionDiv';

// Safe motion button
export interface MotionButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    | 'onDrag'
    | 'onDragEnd'
    | 'onDragStart'
    | 'onDragEnter'
    | 'onDragExit'
    | 'onDragLeave'
    | 'onDragOver'
    | 'onDrop'
    | 'onAnimationStart'
    | 'onAnimationEnd'
  > {
  initial?: MotionProps['initial'];
  animate?: MotionProps['animate'];
  exit?: MotionProps['exit'];
  transition?: MotionProps['transition'];
  whileHover?: MotionProps['whileHover'];
  whileTap?: MotionProps['whileTap'];
  whileFocus?: MotionProps['whileFocus'];
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ initial, animate, exit, transition, whileHover, whileTap, whileFocus, ...htmlProps }, ref) => {
    const motionProps = {
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileFocus,
    };

    // Remove undefined values to prevent passing undefined to Framer Motion
    const cleanMotionProps = Object.fromEntries(
      Object.entries(motionProps).filter(([, value]) => value !== undefined)
    );

    return <motion.button ref={ref} {...htmlProps} {...cleanMotionProps} />;
  }
);
MotionButton.displayName = 'MotionButton';

// Safe motion input
export interface MotionInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    | 'onDrag'
    | 'onDragEnd'
    | 'onDragStart'
    | 'onDragEnter'
    | 'onDragExit'
    | 'onDragLeave'
    | 'onDragOver'
    | 'onDrop'
    | 'onAnimationStart'
    | 'onAnimationEnd'
  > {
  initial?: MotionProps['initial'];
  animate?: MotionProps['animate'];
  exit?: MotionProps['exit'];
  transition?: MotionProps['transition'];
  whileHover?: MotionProps['whileHover'];
  whileFocus?: MotionProps['whileFocus'];
}

export const MotionInput = React.forwardRef<HTMLInputElement, MotionInputProps>(
  ({ initial, animate, exit, transition, whileHover, whileFocus, ...htmlProps }, ref) => {
    const motionProps = {
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileFocus,
    };

    // Remove undefined values to prevent passing undefined to Framer Motion
    const cleanMotionProps = Object.fromEntries(
      Object.entries(motionProps).filter(([, value]) => value !== undefined)
    );

    return <motion.input ref={ref} {...htmlProps} {...cleanMotionProps} />;
  }
);
MotionInput.displayName = 'MotionInput';

// Safe motion textarea
export interface MotionTextareaProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    | 'onDrag'
    | 'onDragEnd'
    | 'onDragStart'
    | 'onDragEnter'
    | 'onDragExit'
    | 'onDragLeave'
    | 'onDragOver'
    | 'onDrop'
    | 'onAnimationStart'
    | 'onAnimationEnd'
  > {
  initial?: MotionProps['initial'];
  animate?: MotionProps['animate'];
  exit?: MotionProps['exit'];
  transition?: MotionProps['transition'];
  whileHover?: MotionProps['whileHover'];
  whileFocus?: MotionProps['whileFocus'];
}

export const MotionTextarea = React.forwardRef<HTMLTextAreaElement, MotionTextareaProps>(
  ({ initial, animate, exit, transition, whileHover, whileFocus, ...htmlProps }, ref) => {
    const motionProps = {
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileFocus,
    };

    // Remove undefined values to prevent passing undefined to Framer Motion
    const cleanMotionProps = Object.fromEntries(
      Object.entries(motionProps).filter(([, value]) => value !== undefined)
    );

    return <motion.textarea ref={ref} {...htmlProps} {...cleanMotionProps} />;
  }
);
MotionTextarea.displayName = 'MotionTextarea';
