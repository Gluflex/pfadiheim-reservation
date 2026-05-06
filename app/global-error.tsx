"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "Arial, sans-serif", margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", color: "#18181b" }}>
        <div style={{ textAlign: "center", padding: "1rem", maxWidth: "28rem" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 900, margin: "0 0 0.75rem" }}>
            Etwas ist schiefgelaufen.
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#52525b", margin: "0 0 1.5rem" }}>
            Probiers nochmal. Wenn das Problem bleibt, schreib an{" "}
            <a href="mailto:af@pfadibaar.ch" style={{ color: "#047857", textDecoration: "underline" }}>
              af@pfadibaar.ch
            </a>
            .
          </p>
          <button
            onClick={reset}
            style={{ padding: "0.625rem 1.25rem", borderRadius: "0.5rem", background: "#047857", color: "white", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
