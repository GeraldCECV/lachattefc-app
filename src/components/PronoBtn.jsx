import { RESULT_COLORS } from '../utils/resultColors'

export default function PronoBtn({ val, selected, onClick, disabled }) {
  const c = RESULT_COLORS[val]
  const isSel = selected === val
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: 42,
        borderRadius: 10,
        border: `1.5px solid ${isSel ? c.sel : 'rgba(255,255,255,.13)'}`,
        background: isSel ? c.dim : 'rgba(255,255,255,.04)',
        color: isSel ? c.sel : 'rgba(255,255,255,.4)',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {c.label}
    </button>
  )
}
