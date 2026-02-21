"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div
      className="skeleton"
      style={{ height: 250, width: "100%", borderRadius: 12 }}
    />
  ),
});

export default function Map(props: any) {
  return <MapInner {...props} />;
}
