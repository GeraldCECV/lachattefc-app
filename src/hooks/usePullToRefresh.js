import { useEffect, useState } from 'react';

export function usePullToRefresh(onRefresh = () => window.location.reload()) {
  const [pulling, setPulling] = useState(false);
  let startY = 0;

  useEffect(() => {
    const scrollable = document.querySelector('.scroll-area');
    if (!scrollable) return;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const scrollTop = scrollable.scrollTop;
      const pullDistance = e.touches[0].clientY - startY;

      // Si on est en haut ET qu'on swipe vers le bas
      if (scrollTop === 0 && pullDistance > 0) {
        setPulling(pullDistance > 60); // Threshold de 60px
      }
    };

    const handleTouchEnd = () => {
      if (pulling) {
        setPulling(false);
        onRefresh();
      } else {
        setPulling(false);
      }
    };

    scrollable.addEventListener('touchstart', handleTouchStart);
    scrollable.addEventListener('touchmove', handleTouchMove, { passive: true });
    scrollable.addEventListener('touchend', handleTouchEnd);

    return () => {
      scrollable.removeEventListener('touchstart', handleTouchStart);
      scrollable.removeEventListener('touchmove', handleTouchMove);
      scrollable.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling, onRefresh]);

  return pulling;
}
