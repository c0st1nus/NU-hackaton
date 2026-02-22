"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./ticket-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      className="skeleton"
      style={{ height: 250, width: "100%", borderRadius: 12 }}
    />
  ),
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: {
    id: string;
    position: [number, number];
    label: string;
  }[];
  height?: number | string;
}

export default function TicketMap(props: MapProps) {
  return <MapInner {...props} />;
}
