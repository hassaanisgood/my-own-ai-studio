/**
 * Studio branding. Change these values to rebrand the whole app —
 * the sidebar, mobile header, page titles, favicon and download filenames
 * all read from here.
 */
export const studio = {
  /** Primary product name shown next to the logo. */
  name: "Northlight",
  /** Short descriptor shown beneath the name in the sidebar. */
  descriptor: "Creative Studio",
  /** Used in <title> and metadata. */
  tagline: "Generate images and video from multiple models in one workspace.",
  /** Prefix used for downloaded files, e.g. northlight-kling-3-0-20261006-1412.mp4 */
  filePrefix: "northlight",
  logo: {
    /**
     * "mark" renders the built-in geometric logo; "monogram" renders `monogram`
     * inside the same tile so a team can swap in their initial without new art.
     */
    variant: "mark" as "mark" | "monogram",
    monogram: "N",
    /** Tile gradient. Keep both stops close in hue for a restrained look. */
    from: "#ff9a5c",
    to: "#e5603a",
  },
  /** Currency used for the illustrative cost estimates. */
  currency: "USD",
} as const;

export type StudioConfig = typeof studio;
