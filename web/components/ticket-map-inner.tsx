"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default Leaflet marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapInnerProps {
  center: [number, number];
  zoom?: number;
  markers?: {
    id: string;
    position: [number, number];
    label: string;
  }[];
  height?: number | string;
}

export default function MapInner({
  center,
  zoom = 13,
  markers = [],
  height = 250,
}: MapInnerProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* If specific markers are provided, render them */}
      {markers.length > 0 ? (
        markers.map((m) => (
          <Marker key={m.id} position={m.position}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))
      ) : (
        /* Default marker at center */
        <Marker position={center}>
          <Popup>Расположение</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
