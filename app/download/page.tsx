export default function DownloadPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Download</h1>
      <p>Here you will be able to download our software and updates.</p>

      <div style={{ marginTop: 30 }}>
        <h2>Latest Version</h2>
        <div style={{ marginTop: 20 }}>
          <h3>v2.4.0</h3>
          <a
            href="https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/v2.4.0/DLAS_Setup_v2.4.0.exe"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 5,
              marginTop: 10
            }}
          >
            Download DLAS Setup v2.4.0
          </a>
        </div>
      </div>
    </div>
  );
}