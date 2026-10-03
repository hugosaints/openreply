import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** 1.91:1, the size WhatsApp, Facebook, LinkedIn and X all render without cropping. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const INK = "#1d2630";
const MUTED = "#5b6b79";
const SUBTLE = "#8996a4";
const ACCENT = "#4f46e5";
const ACCENT_SOFT = "#eef0fe";
const BORDER = "#eceef3";

let fontsPromise: ReturnType<typeof loadFonts> | undefined;

function loadFonts() {
  const dir = join(process.cwd(), "assets", "fonts");
  return Promise.all([
    readFile(join(dir, "Figtree-500.woff")),
    readFile(join(dir, "Figtree-600.woff")),
    readFile(join(dir, "Figtree-700.woff")),
  ]).then(([medium, semibold, bold]) => [
    { name: "Figtree", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Figtree", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Figtree", data: bold, weight: 700 as const, style: "normal" as const },
  ]);
}

export interface OgPreview {
  /** Comment a follower leaves, e.g. `GUIDE! need this`. */
  comment: string;
  /** Private reply that goes out. */
  reply: string;
  /** Label of the button inside the reply. */
  linkLabel: string;
  /** Keyword chip shown on the match line. */
  keyword: string;
}

export interface OgInput {
  eyebrow: string;
  title: string;
  /** Second headline line, rendered in the accent colour. */
  highlight?: string;
  subtitle: string;
  footer: string[];
  preview: OgPreview;
  labels: { campaign: string; active: string; matched: string };
}

function Glyph({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.038 19.927a9.933 9.933 0 0 1 -5.338 -.927l-4.7 1l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c1.993 1.7 2.93 4.043 2.746 6.346" />
      <path d="M19 16l-2 3h4l-2 3" />
    </svg>
  );
}

/** Renders the shared 1200x630 social card; used by the site and template pages. */
export async function renderOgImage(input: OgInput) {
  const fonts = await (fontsPromise ??= loadFonts());
  const { preview, labels } = input;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Figtree",
          color: INK,
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(circle at 85% 0%, #e4e6fd 0%, rgba(255,255,255,0) 52%), radial-gradient(circle at 0% 100%, #f1f2fe 0%, rgba(255,255,255,0) 45%)",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Glyph size={34} color="#ffffff" />
            </div>
            <div style={{ marginLeft: 16, fontSize: 38, fontWeight: 700, letterSpacing: -1 }}>OpenReply</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 999,
                backgroundColor: ACCENT_SOFT,
                color: ACCENT,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {input.eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 24,
                fontSize: input.highlight ? 68 : input.title.length > 26 ? 52 : 60,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: -2.4,
              }}
            >
              <div style={{ display: "flex" }}>{input.title}</div>
              {input.highlight ? <div style={{ display: "flex", color: ACCENT }}>{input.highlight}</div> : null}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 26, fontWeight: 500, color: MUTED, lineHeight: 1.35 }}>
              {input.subtitle}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 21, fontWeight: 600, color: SUBTLE }}>
            {input.footer.map((item, index) => (
              <div key={item} style={{ display: "flex", alignItems: "center" }}>
                {index > 0 ? (
                  <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#c7c9f9", margin: "0 16px" }} />
                ) : null}
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 400,
              backgroundColor: "#ffffff",
              border: `2px solid ${BORDER}`,
              borderRadius: 28,
              boxShadow: "0 30px 60px -24px rgba(29,38,48,0.28)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                borderBottom: `2px solid ${BORDER}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", fontSize: 21, fontWeight: 700 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor: ACCENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Glyph size={19} color="#ffffff" />
                </div>
                {labels.campaign}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 12px",
                  borderRadius: 999,
                  backgroundColor: "#e3f6ef",
                  color: "#2ca87f",
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                {labels.active}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#f5f6fa",
                    color: MUTED,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 17,
                    fontWeight: 700,
                    marginRight: 12,
                  }}
                >
                  M
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "11px 16px",
                    borderRadius: "6px 18px 18px 18px",
                    backgroundColor: "#f5f6fa",
                    fontSize: 21,
                    fontWeight: 500,
                  }}
                >
                  {preview.comment}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", margin: "20px 0", fontSize: 17, color: MUTED }}>
                <div
                  style={{
                    display: "flex",
                    padding: "5px 12px",
                    borderRadius: 999,
                    backgroundColor: ACCENT_SOFT,
                    color: ACCENT,
                    fontWeight: 600,
                  }}
                >
                  {labels.matched}: {preview.keyword}
                </div>
                <div style={{ display: "flex", flex: 1, height: 2, backgroundColor: BORDER, marginLeft: 12 }} />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: 48,
                  padding: "16px 18px",
                  borderRadius: "6px 20px 20px 20px",
                  backgroundColor: ACCENT,
                  color: "#ffffff",
                }}
              >
                <div style={{ display: "flex", fontSize: 21, fontWeight: 500, lineHeight: 1.35 }}>{preview.reply}</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 14,
                    padding: "10px 14px",
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.18)",
                    fontSize: 19,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: "flex" }}>{preview.linkLabel}</div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
