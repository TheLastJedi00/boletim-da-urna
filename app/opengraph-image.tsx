import { ImageResponse } from "next/og";

export const alt = "Boletim da Urna — estudo de caso de Leno Borges com dados da Justiça Eleitoral";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#1c1c1e",
          color: "#a3a7ad",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: "#3986ff", letterSpacing: 2 }}>
          ESTUDO DE CASO · ELEIÇÃO PRESIDENCIAL 2026
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, color: "#f2f3f5", fontWeight: 700 }}>Boletim da Urna</div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 16, maxWidth: 960 }}>
            Os boletins de urna, as pesquisas e os sinais de fraude explicados com dados oficiais.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
          <span>Estudo de caso feito por Leno Borges usando dados da Justiça Eleitoral</span>
          <span style={{ color: "#488fff" }}>lenoborges.com.br</span>
        </div>
      </div>
    ),
    size,
  );
}
