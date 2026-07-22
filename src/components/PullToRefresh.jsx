import { useEffect, useState } from 'react';

export default function PullToRefresh() {
  const [pulling, setPulling] = useState(false);
  let startY = 0;

  useEffect(() => {
    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const pullDistance = e.touches[0].clientY - startY;

      // Si on est en haut ET qu'on swipe vers le bas
      if (scrollTop === 0 && pullDistance > 0) {
        setPulling(pullDistance > 80);
      } else {
        setPulling(false);
      }
    };

    const handleTouchEnd = () => {
      if (pulling) {
        window.location.reload();
      }
      setPulling(false);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling]);

  return (
    <>
      {pulling && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: 'linear-gradient(180deg, rgba(155,226,45,.2), transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          fontSize: 12,
          color: 'var(--g)',
          fontWeight: 700,
        }}>
          ↻ Relâche pour rafraîchir
        </div>
      )}
    </>
  );
}
