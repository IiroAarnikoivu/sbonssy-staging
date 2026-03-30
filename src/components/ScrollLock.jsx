'use client';

import { useEffect } from 'react';

const ScrollLock = ({ isLocked }) => {
  useEffect(() => {
    if (isLocked) {
      // Prevent scrolling on mobile
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isLocked]);

  return null;
};

export default ScrollLock;
