import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// A blue dot — matches the app's --color-accent (app/globals.css) so the
// favicon reads as the same "ink" used for links and accents in the UI.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "72%",
            height: "72%",
            borderRadius: "50%",
            background: "#0088b0",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
