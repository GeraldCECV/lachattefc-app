import { RESULT_COLORS } from '../utils/resultColors'

export default function DcBtn({ val, selected, onClick }) {
  const c = RESULT_COLORS[val]
  const isSel = selected?.includes(val)
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 42,
        borderRadius: 10,
        border: `1.5px solid ${isSel ? c.sel : 'rgba(255,255,255,.13)'}`,
        background: isSel ? c.dim : 'rgba(255,255,255,.04)',
        color: isSel ? c.sel : 'rgba(255,255,255,.4)',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {c.label} {isSel ? '✓' : ''}
    </button>
  )
}
