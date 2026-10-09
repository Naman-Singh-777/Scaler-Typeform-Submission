/** Original looping animations for the three product sections (pure CSS, no media files, so they always play). */
const Stars = () => (
  <div className="sv-stars">
    {[0, 1, 2, 3, 4].map((i) => (
      <svg key={i} viewBox="0 0 24 24" style={{ ['--i' as any]: i }}><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" strokeLinejoin="round" /></svg>
    ))}
  </div>
);

export default function SectionVisual({ kind }: { kind: 'forms' | 'growth' | 'research' }) {
  if (kind === 'forms') {
    return (
      <div className="sv sv--forms" role="img" aria-label="A typed prompt turns into a feedback form">
        <div className="sv-prompt"><span className="sv-typed">Build a feedback form for my yoga studio</span></div>
        <div className="sv-card">
          <small>1 →</small>
          <b>How was your class today?</b>
          <Stars />
          <span className="sv-ok">OK ✓</span>
        </div>
      </div>
    );
  }
  if (kind === 'growth') {
    return (
      <div className="sv sv--growth" role="img" aria-label="A new lead is segmented and followed up automatically">
        <div className="sv-node n1"><i className="av" />New lead<em>maria@acme.co</em></div>
        <div className="sv-wire w1" />
        <div className="sv-node n2">AI segment<em>Enterprise · high intent</em></div>
        <div className="sv-wire w2" />
        <div className="sv-node n3"><span className="tick">✓</span>Follow-up sent<em>Personalised email</em></div>
      </div>
    );
  }
  return (
    <div className="sv sv--research" role="img" aria-label="An AI moderator interviews a respondent and summarises the findings">
      <div className="sv-bub b1">What made you choose us?</div>
      <div className="sv-bub b2">Setting it up took minutes.</div>
      <div className="sv-bub b3">Anything you would change?</div>
      <div className="sv-insight">
        <b>Findings</b>
        {[['Ease of setup', 86], ['Value for money', 64], ['Support', 48]].map(([l, v], i) => (
          <div className="row" key={l as string}><span>{l}</span><div><i style={{ ['--w' as any]: `${v}%`, ['--k' as any]: i }} /></div></div>
        ))}
      </div>
    </div>
  );
}
