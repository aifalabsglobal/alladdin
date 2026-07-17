"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0e14",
          color: "#f2f5f9",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            Alladin hit an unexpected error
          </h2>
          <p style={{ fontSize: 14, color: "#8e99a8", marginTop: 8 }}>
            {error.digest ? `Reference: ${error.digest}` : "Please try again."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 12,
              border: "1px solid #262c35",
              background: "#181c22",
              color: "#00e676",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
