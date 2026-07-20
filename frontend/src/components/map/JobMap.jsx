/**
 * JobMap.jsx — Leaflet map showing job markers, user location, and radius circle.
 * Uses OpenStreetMap tiles.
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// ─── User location icon (blue dot) ────────────────────────────────────────────
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#4f46e5;border:3px solid white;
    box-shadow:0 0 0 2px #4f46e5;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * AutoFit — adjusts map bounds to fit all visible markers.
 */
function AutoFit({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions || positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    }
  }, [positions, map]);

  return null;
}

function formatSalary(min, max, period) {
  if (!min && !max) return null;
  const fmt = (n) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
  const range = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt(min || max);
  return period === 'STIPEND' ? `${range}/month` : `${range}/${period === 'MONTH' ? 'mo' : 'yr'}`;
}

export default function JobMap({ jobs = [], userLocation = null, radiusKm = null }) {
  // Filter jobs that have valid coordinates
  const validJobs = jobs.filter(
    (j) => j.latitude != null && j.longitude != null
  );

  const allPositions = [
    ...validJobs.map((j) => [parseFloat(j.latitude), parseFloat(j.longitude)]),
    ...(userLocation ? [[userLocation.lat, userLocation.lng]] : []),
  ];

  // Default center: India
  const defaultCenter = [20.5937, 78.9629];
  const defaultZoom = 5;

  return (
    <div style={{ height: '480px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to all markers */}
        {allPositions.length > 0 && <AutoFit positions={allPositions} />}

        {/* User location marker + radius */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
            >
              <Popup>
                <strong>Your Location</strong>
                <br />
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </Popup>
            </Marker>

            {radiusKm && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={radiusKm * 1000}
                pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.06 }}
              />
            )}
          </>
        )}

        {/* Job markers */}
        {validJobs.map((job) => {
          const lat = parseFloat(job.latitude);
          const lng = parseFloat(job.longitude);
          const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);

          return (
            <Marker key={job.id} position={[lat, lng]}>
              <Popup minWidth={220}>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '13px', lineHeight: '1.5' }}>
                  <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                    {job.title}
                  </strong>
                  {job.displayJobId && (
                    <span style={{ fontSize: '10px', color: '#6366f1', fontFamily: 'monospace' }}>
                      {job.displayJobId}
                    </span>
                  )}
                  <br />
                  <span style={{ color: '#4f46e5', fontWeight: '600' }}>{job.company?.name || job.company_name}</span>
                  <br />
                  <span style={{ color: '#6b7280' }}>{job.city}{job.state ? `, ${job.state}` : ''}</span>
                  {job.distanceKm != null && (
                    <><br /><span style={{ color: '#10b981' }}>📍 {job.distanceKm} km away</span></>
                  )}
                  {salary && (
                    <><br /><span style={{ color: '#f59e0b' }}>{salary}</span></>
                  )}
                  <br />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/jobs/${job.id}`}
                      style={{
                        color: 'white',
                        background: '#4f46e5',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '12px',
                      }}
                    >
                      View Details →
                    </Link>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#4f46e5',
                        border: '1px solid #c7d2fe',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '12px',
                      }}
                    >
                      🗺️ Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
