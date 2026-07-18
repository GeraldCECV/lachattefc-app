import { useState, useEffect } from 'react';
import { translateTeam } from '../utils/teamName';
import { MAILLOTS } from '../assets/maillotsMap';

function normalize(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
}

function getMaillotUrl(club) {
  if (!club) return null;
  const n = normalize(club);
  if (MAILLOTS[n]) return MAILLOTS[n][0];
  for (const [key, url] of Object.entries(MAILLOTS)) {
    if (n.includes(key) || key.includes(n)) return url;
  }
  return null;
}

export default function JerseyAvatar({ club, initials, size = 40 }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const url = getMaillotUrl(club);
    setImageUrl(url);
    setHasError(false);
  }, [club]);

  if (imageUrl && !hasError) {
    return (
      <img
        key={`${club}-${imageUrl}`}
        src={imageUrl}
        alt={translateTeam(club)}
        title={translateTeam(club)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(155,226,45,.12)',
        border: '1px solid rgba(155,226,45,.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 900,
        color: 'var(--g)',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
