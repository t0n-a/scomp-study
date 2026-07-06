export default function TheoryRefs({ refs }) {
  if (!refs || refs.length === 0) return null
  return (
    <div className="theory-refs">
      <span className="theory-refs-label">Teoria:</span>
      {refs.map((r, i) => (
        <a
          key={i}
          className="theory-link"
          href={`/pdfs/${r.pdf}#page=${r.page}`}
          target="_blank"
          rel="noreferrer"
        >
          {r.label} ({r.pdf.replace('SCOMP2526-', '').replace('.pdf', '')} p.{r.page})
        </a>
      ))}
    </div>
  )
}
