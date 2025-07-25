import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, Circle } from 'react-leaflet';
import { LatLngTuple, LeafletMouseEvent } from 'leaflet';
import { 
  X, MapPin, Settings, Download, 
  AlertTriangle, Navigation,
  Target, Layers, Bug, RefreshCw, Clock, Map as MapIcon,
  Eye, EyeOff, Trash2, Copy, Share2
} from 'lucide-react';
import Select from 'react-select';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Define custom map tile layers
const MAP_LAYERS = {
  openstreetmap: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

// Incident types with colors and icons
const INCIDENT_TYPES = [
  { value: 'emergency', label: '🚨 Emergency', color: '#dc2626', priority: 'high' },
  { value: 'suspicious', label: '👁️ Suspicious Activity', color: '#f59e0b', priority: 'medium' },
  { value: 'traffic', label: '🚗 Traffic Incident', color: '#3b82f6', priority: 'medium' },
  { value: 'medical', label: '🏥 Medical Emergency', color: '#ef4444', priority: 'high' },
  { value: 'fire', label: '🔥 Fire/Hazard', color: '#dc2626', priority: 'high' },
  { value: 'theft', label: '🔓 Theft/Break-in', color: '#f59e0b', priority: 'high' },
  { value: 'vandalism', label: '🔨 Vandalism', color: '#6366f1', priority: 'low' },
  { value: 'noise', label: '🔊 Noise Complaint', color: '#8b5cf6', priority: 'low' },
  { value: 'public_safety', label: '🛡️ Public Safety', color: '#10b981', priority: 'medium' },
  { value: 'weather', label: '🌧️ Weather Alert', color: '#06b6d4', priority: 'medium' },
  { value: 'infrastructure', label: '🚧 Infrastructure', color: '#f97316', priority: 'low' },
  { value: 'other', label: '📍 Other', color: '#6b7280', priority: 'low' }
];

interface DebugInfo {
  timestamp: string;
  action: string;
  details: any;
  level: 'info' | 'warning' | 'error';
}

interface LocationHistory {
  id: string;
  lat: number;
  lng: number;
  address: string;
  timestamp: Date;
  type: 'search' | 'click' | 'gps';
}

interface SmallMapProps {
  lat: number;
  lng: number;
  address?: string;
  onMapClick?: () => void;
  className?: string;
  showAddress?: boolean;
  incidentType?: string;
}

export function SmallMap({ lat, lng, address, onMapClick, className = '', showAddress = true, incidentType }: SmallMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const position: LatLngTuple = [lat, lng];
  const incidentColor = INCIDENT_TYPES.find(t => t.value === incidentType)?.color || '#6366f1';

  const handleMapLoad = () => {
    setIsLoading(false);
  };

  

  return (
    <div className={`relative ${className}`}>
      <div 
        className="w-32 h-20 rounded-lg overflow-hidden cursor-pointer border border-accent/30 hover:border-accent/60 transition-all duration-300 hover:shadow-lg hover:scale-105"
        onClick={onMapClick}
        style={{ borderColor: incidentType ? incidentColor : undefined }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {mapError ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <MapIcon className="w-8 h-8 text-gray-400" />
          </div>
        ) : (
          <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            boxZoom={false}
            keyboard={false}
            attributionControl={false}
            whenReady={handleMapLoad}
          >
            <TileLayer 
              url={MAP_LAYERS.openstreetmap.url}
              errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            />
            <Marker position={position}>
              {incidentType && (
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold" style={{ color: incidentColor }}>
                      {INCIDENT_TYPES.find(t => t.value === incidentType)?.label}
                    </div>
                    {address && <div className="text-gray-600 mt-1">{address}</div>}
                  </div>
                </Popup>
              )}
            </Marker>
          </MapContainer>
        )}
      </div>
      {showAddress && address && (
        <div className="text-xs text-gray-400 mt-1 max-w-32 truncate" title={address}>
          {address}
        </div>
      )}
      {incidentType && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white" 
             style={{ backgroundColor: incidentColor }}
             title={INCIDENT_TYPES.find(t => t.value === incidentType)?.label}
        />
      )}
    </div>
  );
}

interface BigMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  address?: string;
  incidentType?: string;
  showDebug?: boolean;
}

export function BigMapModal({ isOpen, onClose, lat, lng, address, incidentType, showDebug = false }: BigMapModalProps) {
  const [selectedLayer, setSelectedLayer] = useState<keyof typeof MAP_LAYERS>('openstreetmap');
  const [showCircle, setShowCircle] = useState(false);
  const [circleRadius, setCircleRadius] = useState(100);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showControls, setShowControls] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const addDebugInfo = useCallback((action: string, details: any, level: 'info' | 'warning' | 'error' = 'info') => {
    if (!showDebug) return;
    setDebugInfo(prev => [
      ...prev.slice(-19), // Keep only last 20 entries
      {
        timestamp: new Date().toLocaleTimeString(),
        action,
        details,
        level
      }
    ]);
  }, [showDebug]);

  useEffect(() => {
    if (isOpen) {
      addDebugInfo('Modal Opened', { lat, lng, address, incidentType });
    }
  }, [isOpen, lat, lng, address, incidentType, addDebugInfo]);

  const handleModalClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      addDebugInfo('Modal Closed', { reason: 'backdrop_click' });
      onClose();
    }
  };

  const handleCloseButton = () => {
    addDebugInfo('Modal Closed', { reason: 'close_button' });
    onClose();
  };

  const handleExportLocation = () => {
    const locationData = {
      latitude: lat,
      longitude: lng,
      address,
      incidentType,
      timestamp: new Date().toISOString(),
      mapLayer: selectedLayer
    };
    
    const blob = new Blob([JSON.stringify(locationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location_${lat.toFixed(6)}_${lng.toFixed(6)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addDebugInfo('Location Exported', locationData);
  };

  const handleCopyCoordinates = async () => {
    const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(coords);
      addDebugInfo('Coordinates Copied', { coordinates: coords });
      alert('Coordinates copied to clipboard!');
    } catch (error) {
      addDebugInfo('Copy Failed', { error: String(error) }, 'error');
      alert('Failed to copy coordinates');
    }
  };

  const handleShareLocation = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Location Share',
          text: `Location: ${address || 'Unknown address'}`,
          url: `https://www.google.com/maps?q=${lat},${lng}`
        });
        addDebugInfo('Location Shared', { method: 'native_share' });
      } catch (error) {
        addDebugInfo('Share Failed', { error: String(error) }, 'error');
      }
    } else {
      // Fallback to copying Google Maps link
      const link = `https://www.google.com/maps?q=${lat},${lng}`;
      try {
        await navigator.clipboard.writeText(link);
        addDebugInfo('Maps Link Copied', { link });
        alert('Google Maps link copied to clipboard!');
      } catch (error) {
        addDebugInfo('Copy Failed', { error: String(error) }, 'error');
      }
    }
  };

  if (!isOpen) return null;

  const position: LatLngTuple = [lat, lng];
  const incidentColor = INCIDENT_TYPES.find(t => t.value === incidentType)?.color || '#6366f1';

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleModalClick}
    >
      <div 
        ref={modalRef}
        className="bg-black/90 backdrop-blur border border-accent/30 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-accent/30">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="text-lg font-semibold text-accent flex items-center space-x-2">
                <MapIcon className="w-5 h-5" />
                <span>Location Details</span>
              </h3>
              {address && <p className="text-sm text-gray-400">{address}</p>}
              {incidentType && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: incidentColor }} />
                  <span className="text-sm" style={{ color: incidentColor }}>
                    {INCIDENT_TYPES.find(t => t.value === incidentType)?.label}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowControls(!showControls)}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title="Toggle Controls"
            >
              {showControls ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={handleCloseButton}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title="Close Modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Map */}
          <div className="flex-1 relative">
            <div className="h-96">
              <MapContainer
                center={position}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url={MAP_LAYERS[selectedLayer].url}
                  attribution={MAP_LAYERS[selectedLayer].attribution}
                />
                <Marker position={position}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">Location Details</div>
                      <div>Lat: {lat.toFixed(6)}</div>
                      <div>Lng: {lng.toFixed(6)}</div>
                      {address && <div className="mt-1 text-gray-600">{address}</div>}
                    </div>
                  </Popup>
                </Marker>
                {showCircle && (
                  <Circle
                    center={position}
                    radius={circleRadius}
                    color={incidentColor}
                    fillColor={incidentColor}
                    fillOpacity={0.2}
                  />
                )}
              </MapContainer>
            </div>

            {/* Map Controls Overlay */}
            {showControls && (
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur rounded-lg p-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <select
                    value={selectedLayer}
                    onChange={(e) => {
                      setSelectedLayer(e.target.value as keyof typeof MAP_LAYERS);
                      addDebugInfo('Layer Changed', { layer: e.target.value });
                    }}
                    className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-accent/30"
                  >
                    {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                      <option key={key} value={key}>{layer.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showCircle}
                    onChange={(e) => {
                      setShowCircle(e.target.checked);
                      addDebugInfo('Circle Toggle', { showing: e.target.checked });
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">Show Radius</span>
                </div>

                {showCircle && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Radius:</span>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="50"
                      value={circleRadius}
                      onChange={(e) => {
                        setCircleRadius(parseInt(e.target.value));
                        addDebugInfo('Radius Changed', { radius: e.target.value });
                      }}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-400">{circleRadius}m</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Panel */}
          {showControls && (
            <div className="w-80 border-l border-accent/30 bg-black/40">
              {/* Quick Actions */}
              <div className="p-4 border-b border-accent/30">
                <h4 className="text-sm font-semibold text-accent mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyCoordinates}
                    className="flex items-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 p-2 rounded text-sm transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleShareLocation}
                    className="flex items-center space-x-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 p-2 rounded text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={handleExportLocation}
                    className="flex items-center space-x-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 p-2 rounded text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
                    className="flex items-center space-x-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 p-2 rounded text-sm transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Navigate</span>
                  </button>
                </div>
              </div>

              {/* Location Info */}
              <div className="p-4 border-b border-accent/30">
                <h4 className="text-sm font-semibold text-accent mb-3">Coordinates</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Latitude:</span>
                    <span className="ml-2 text-white font-mono">{lat.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Longitude:</span>
                    <span className="ml-2 text-white font-mono">{lng.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Format:</span>
                    <span className="ml-2 text-white font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>

              {/* Debug Panel */}
              {showDebug && (
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-accent mb-3 flex items-center space-x-2">
                    <Bug className="w-4 h-4" />
                    <span>Debug Log</span>
                  </h4>
                  <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                    {debugInfo.map((info, index) => (
                      <div key={index} className={`p-2 rounded ${
                        info.level === 'error' ? 'bg-red-900/20 text-red-400' :
                        info.level === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                        'bg-gray-900/20 text-gray-400'
                      }`}>
                        <div className="font-mono">
                          <span className="text-gray-500">{info.timestamp}</span>
                          <span className="ml-2">{info.action}</span>
                        </div>
                        {info.details && (
                          <div className="mt-1 text-gray-500 font-mono">
                            {JSON.stringify(info.details)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface IncidentMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number };
  className?: string;
  showSearchRadius?: boolean;
  searchRadius?: number;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function IncidentMap({ onLocationSelect, selectedLocation, className = '', showSearchRadius = false, searchRadius = 500 }: IncidentMapProps) {
  // Default to Flatbush area
  const defaultCenter: LatLngTuple = [40.65, -73.95];
  const center = selectedLocation ? [selectedLocation.lat, selectedLocation.lng] as LatLngTuple : defaultCenter;

  return (
    <div className={`h-64 rounded-lg overflow-hidden border border-accent/30 ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={MAP_LAYERS.openstreetmap.url}
          attribution={MAP_LAYERS.openstreetmap.attribution}
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
        {selectedLocation && (
          <>
            <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Selected Location</div>
                  <div>Lat: {selectedLocation.lat.toFixed(6)}</div>
                  <div>Lng: {selectedLocation.lng.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
            {showSearchRadius && (
              <Circle
                center={[selectedLocation.lat, selectedLocation.lng]}
                radius={searchRadius}
                color="#3b82f6"
                fillColor="#3b82f6"
                fillOpacity={0.1}
              />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}

// Address search interface and functions
interface AddressSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

async function searchAddresses(query: string): Promise<AddressSearchResult[]> {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`
    );
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Address search failed:', error);
    return [];
  }
}

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, location: { lat: number; lng: number }, address: string, incidentType: string, priority: string, attachments?: File[]) => void;
}

export function IncidentReportModal({ isOpen, onClose, onSubmit }: IncidentReportModalProps) {
  const [description, setDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  const [incidentType, setIncidentType] = useState('other');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPriority, setCustomPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [gpsTracking, setGpsTracking] = useState(false);
  const [currentGpsLocation, setCurrentGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  const addDebugInfo = useCallback((action: string, details: any, level: 'info' | 'warning' | 'error' = 'info') => {
    setDebugInfo(prev => [
      ...prev.slice(-49), // Keep only last 50 entries
      {
        timestamp: new Date().toLocaleTimeString(),
        action,
        details,
        level
      }
    ]);
  }, []);

  const addLocationToHistory = useCallback((lat: number, lng: number, address: string, type: 'search' | 'click' | 'gps') => {
    const newEntry: LocationHistory = {
      id: Date.now().toString(),
      lat,
      lng,
      address,
      timestamp: new Date(),
      type
    };
    setLocationHistory(prev => [newEntry, ...prev.slice(0, 19)]); // Keep only last 20 entries
    addDebugInfo('Location History Added', newEntry);
  }, [addDebugInfo]);

  // GPS Tracking Effect
  useEffect(() => {
    let watchId: number | null = null;
    
    if (gpsTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentGpsLocation({ lat: latitude, lng: longitude });
          addDebugInfo('GPS Update', { lat: latitude, lng: longitude, accuracy: position.coords.accuracy });
        },
        (error) => {
          addDebugInfo('GPS Error', { error: String(error) }, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [gpsTracking, addDebugInfo]);

  const handleAddressSearch = async (query: string) => {
    if (!query.trim()) {
      setAddressSearchResults([]);
      return;
    }

    setIsSearchingAddresses(true);
    addDebugInfo('Address Search Started', { query });

    try {
      const results = await searchAddresses(query);
      setAddressSearchResults(results);
      addDebugInfo('Address Search Completed', { resultsCount: results.length });
    } catch (error) {
      addDebugInfo('Address Search Failed', { error: String(error) }, 'error');
    } finally {
      setIsSearchingAddresses(false);
    }
  };

  const handleAddressSelect = async (result: AddressSearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setSelectedLocation({ lat, lng });
    setAddress(result.display_name);
    setAddressSearchQuery('');
    setAddressSearchResults([]);
    
    addLocationToHistory(lat, lng, result.display_name, 'search');
    addDebugInfo('Address Selected', { lat, lng, address: result.display_name });
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setIsGettingAddress(true);
    
    addDebugInfo('Map Location Selected', { lat, lng });
    
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      const resolvedAddress = data.display_name || 'Address lookup failed';
      setAddress(resolvedAddress);
      
      addLocationToHistory(lat, lng, resolvedAddress, 'click');
      addDebugInfo('Reverse Geocoding Success', { address: resolvedAddress });
    } catch (error) {
      const errorMsg = 'Address lookup failed';
      setAddress(errorMsg);
      addDebugInfo('Reverse Geocoding Failed', { error: String(error) }, 'error');
    } finally {
      setIsGettingAddress(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    addDebugInfo('Files Added', { fileCount: files.length, totalFiles: attachments.length + files.length });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    addDebugInfo('File Removed', { index });
  };

  const handleSubmit = () => {
    if (!description.trim() || !selectedLocation) {
      alert('Please provide a description and select a location');
      addDebugInfo('Submission Failed', { reason: 'missing_required_fields' }, 'error');
      return;
    }

    const priority = INCIDENT_TYPES.find(t => t.value === incidentType)?.priority || customPriority;
    
    addDebugInfo('Incident Submitted', {
      description: description.substring(0, 50) + '...',
      location: selectedLocation,
      incidentType,
      priority,
      attachmentCount: attachments.length
    });

    onSubmit(description, selectedLocation, address, incidentType, priority, attachments);
    handleClose();
  };

  const handleClose = () => {
    setDescription('');
    setSelectedLocation(undefined);
    setAddress('');
    setIncidentType('other');
    setAddressSearchQuery('');
    setAddressSearchResults([]);
    setAttachments([]);
    setShowAdvanced(false);
    setGpsTracking(false);
    setCurrentGpsLocation(null);
    addDebugInfo('Modal Closed', {});
    onClose();
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await handleLocationSelect(latitude, longitude);
        addLocationToHistory(latitude, longitude, address, 'gps');
      },
      (error) => {
        addDebugInfo('GPS Location Failed', { error: String(error) }, 'error');
        alert('Could not get your location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (!isOpen) return null;

  const selectedIncidentType = INCIDENT_TYPES.find(t => t.value === incidentType);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-black/90 backdrop-blur border border-accent/30 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-accent/30">
          <h3 className="text-lg font-semibold text-accent flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Report Incident</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title="Toggle Debug Panel"
            >
              <Bug className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex">
          {/* Main Form */}
          <div className="flex-1 p-4 space-y-4">
            {/* Incident Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Incident Type</label>
              <Select
                value={{ value: incidentType, label: selectedIncidentType?.label || 'Other' }}
                onChange={(option) => {
                  if (option) {
                    setIncidentType(option.value);
                    addDebugInfo('Incident Type Changed', { type: option.value });
                  }
                }}
                options={INCIDENT_TYPES.map(type => ({ value: type.value, label: type.label }))}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderColor: 'rgba(50,205,50,0.3)',
                    color: 'white'
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? 'rgba(50,205,50,0.2)' : 'transparent',
                    color: 'white'
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'white'
                  })
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Incident Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident in detail..."
                className="w-full p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400 resize-none"
                rows={4}
              />
              <div className="text-xs text-gray-400 mt-1">
                {description.length}/1000 characters
              </div>
            </div>

            {/* Address Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search Address</label>
              <div className="relative">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={addressSearchQuery}
                    onChange={(e) => {
                      setAddressSearchQuery(e.target.value);
                      if (e.target.value.length > 2) {
                        handleAddressSearch(e.target.value);
                      }
                    }}
                    placeholder="Type address or location name..."
                    className="flex-1 p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400"
                  />
                  <button
                    onClick={getCurrentLocation}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
                    title="Use current location"
                  >
                    <Target className="w-5 h-5" />
                  </button>
                </div>
                
                {isSearchingAddresses && (
                  <div className="absolute top-full left-0 right-0 bg-black/90 border border-accent/30 rounded-lg mt-1 p-2">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Searching addresses...</span>
                    </div>
                  </div>
                )}
                
                {addressSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-black/90 border border-accent/30 rounded-lg mt-1 max-h-48 overflow-y-auto z-10">
                    {addressSearchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleAddressSelect(result)}
                        className="w-full text-left p-3 hover:bg-accent/20 border-b border-accent/10 last:border-b-0"
                      >
                        <div className="text-white text-sm">{result.display_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Location Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Location <span className="text-red-400">*</span>
              </label>
              <div className="text-sm text-gray-400 mb-2">
                Click on the map to select the incident location or search for an address above
              </div>
              <IncidentMap
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                showSearchRadius={true}
                searchRadius={100}
              />
            </div>

            {/* Selected Location Display */}
            {selectedLocation && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-blue-400 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Selected Location</span>
                </div>
                <div className="text-sm text-gray-300">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
                {isGettingAddress ? (
                  <div className="text-sm text-gray-400 mt-1">Getting address...</div>
                ) : address && (
                  <div className="text-sm text-gray-400 mt-1">{address}</div>
                )}
              </div>
            )}

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Advanced Options</span>
                <span className="text-xs">({showAdvanced ? 'Hide' : 'Show'})</span>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-black/20 rounded-lg border border-accent/30">
                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Attachments (Photos/Videos)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="w-full p-2 bg-black/20 border border-accent/30 rounded-lg text-white"
                    />
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-black/40 p-2 rounded">
                            <span className="text-sm text-gray-300">{file.name}</span>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GPS Tracking */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={gpsTracking}
                      onChange={(e) => setGpsTracking(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Enable GPS tracking</span>
                    {currentGpsLocation && (
                      <span className="text-xs text-green-400">
                        (Tracking: {currentGpsLocation.lat.toFixed(4)}, {currentGpsLocation.lng.toFixed(4)})
                      </span>
                    )}
                  </div>

                  {/* Custom Priority */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority Override</label>
                    <select
                      value={customPriority}
                      onChange={(e) => setCustomPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full p-2 bg-black/20 border border-accent/30 rounded-lg text-white"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Location History */}
            {locationHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Recent Locations</span>
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {locationHistory.slice(0, 5).map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc.lat, loc.lng)}
                      className="w-full text-left p-2 bg-black/20 hover:bg-black/40 rounded text-sm border border-accent/20"
                    >
                      <div className="text-white truncate">{loc.address}</div>
                      <div className="text-xs text-gray-400">
                        {loc.type} • {loc.timestamp.toLocaleTimeString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <div className="w-80 border-l border-accent/30 bg-black/40">
              <div className="p-4">
                <h4 className="text-sm font-semibold text-accent mb-3 flex items-center space-x-2">
                  <Bug className="w-4 h-4" />
                  <span>Debug Panel</span>
                </h4>
                
                {/* Debug Controls */}
                <div className="space-y-2 mb-4">
                  <button
                    onClick={() => setDebugInfo([])}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 p-2 rounded text-sm transition-colors"
                  >
                    Clear Debug Log
                  </button>
                  <button
                    onClick={() => {
                      const debugData = JSON.stringify(debugInfo, null, 2);
                      const blob = new Blob([debugData], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `incident_debug_${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 p-2 rounded text-sm transition-colors"
                  >
                    Export Debug Log
                  </button>
                </div>

                {/* Debug Log */}
                <div className="space-y-1 text-xs max-h-96 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index} className={`p-2 rounded ${
                      info.level === 'error' ? 'bg-red-900/20 text-red-400' :
                      info.level === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                      'bg-gray-900/20 text-gray-400'
                    }`}>
                      <div className="font-mono flex justify-between">
                        <span>{info.action}</span>
                        <span className="text-gray-500">{info.timestamp}</span>
                      </div>
                      {info.details && (
                        <div className="mt-1 text-gray-500 font-mono text-xs">
                          {typeof info.details === 'object' ? 
                            JSON.stringify(info.details, null, 1) : 
                            info.details
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex space-x-3 p-4 border-t border-accent/30">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !selectedLocation}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            style={{ backgroundColor: selectedIncidentType?.color }}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report {selectedIncidentType?.label.split(' ')[1] || 'Incident'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
