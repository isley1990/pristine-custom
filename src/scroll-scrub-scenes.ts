/**
 * Scene data for the Pristine Custom journey. One continuous 15s film, split
 * into four frame-contiguous segments so each chapter owns a stretch of the
 * same take. Every poster is the first frame of the encoded clip beside it.
 */
import type {
  ScrollScrubScene,
  ScrollScrubTheme,
} from "@/components/scroll-scrub/scroll-scrub";

export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "#D6232F",
  background: "#1C1F25",
  ink: "#EEF0F3",
  muted: "#A0A7B2",
};

const seg = (n: number) => ({
  clip: `/assets/world/scene-0${n}.mp4`,
  mobileClip: `/assets/world/scene-0${n}-mobile.mp4`,
  mobilePoster: `/assets/world/scene-0${n}-mobile-poster.webp`,
  poster: `/assets/world/scene-0${n}-poster.webp`,
});

export const scrollScrubScenes: ScrollScrubScene[] = [
  {
    ...seg(1),
    id: "start",
    label: "Start",
    title: "Built to roll pristine.",
    body: "2,300+ trailer parts: custom wheels, ST tires and every part under the frame, matched to your trailer.",
    scroll: 1.5,
  },
  {
    ...seg(2),
    id: "wheels",
    label: "Wheels",
    align: "right",
    title: "Chrome that holds up.",
    body: "Aluminum, galvanized and painted trailer wheels from 8 to 16 inches, sold bare or mounted on new ST tires.",
    tags: ["4, 5, 6 and 8 lug", "Mounted assemblies"],
    scroll: 1.5,
  },
  {
    ...seg(3),
    id: "parts",
    label: "Parts",
    title: "Every part under the frame.",
    body: "Axles, hubs, brakes, couplers, jacks, lights and fenders for utility, car hauler and boat trailers.",
    tags: ["Galvanized and painted axles", "Electric and idler hubs"],
    scroll: 1.5,
  },
  {
    ...seg(4),
    id: "build",
    label: "Your build",
    align: "right",
    title: "Your trailer, done right.",
    body: "Tell us what you tow and what it needs. We match the parts and send your quote.",
    scroll: 1.6,
  },
];
