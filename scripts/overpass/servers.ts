import type { OverpassServer } from "./types";

const overpassChKey = process.env.OVERPASS_CH_KEY?.trim();

export const OVERPASS_SERVERS: OverpassServer[] = [
  ...(overpassChKey
    ? [
        {
          name: "overpass.ch",
          interpreterUrl: `https://api.overpass.ch/v1/${overpassChKey}/interpreter`,
          healthUrl: "https://api.overpass.ch/healthz",
          referer: "https://openstreetmap.haignet.co.uk/",
          timeoutSeconds: 60,
        },
      ]
    : []),

  {
    name: "overpass-api.de",
    interpreterUrl: "https://overpass-api.de/api/interpreter",
    timeoutSeconds: 60,
  },
];

if (!overpassChKey) {
  console.warn("OVERPASS_CH_KEY is not configured; overpass.ch will be skipped.",);
}
