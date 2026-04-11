export default function LegalPage({ type }) {
  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '40px', display: 'block', margin: '0 auto 40px' }} />
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#F0ECE6', marginBottom: '16px' }}>
          {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
        </div>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.8, marginBottom: '32px' }}>
          Our {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'} is being finalized and will be published here shortly.
          <br /><br />
          In the meantime, if you have any questions about how we handle your data or our terms of use, please reach out directly.
        </div>
        <a href="mailto:support@hque.com" style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', textDecoration: 'none' }}>support@hque.com</a>
        <div style={{ marginTop: '40px' }}>
          <a href="https://h-que.com" style={{ fontSize: '10px', color: '#444', textDecoration: 'none', letterSpacing: '0.1em' }}>← Back to HQue</a>
        </div>
      </div>
    </div>
  )
}
