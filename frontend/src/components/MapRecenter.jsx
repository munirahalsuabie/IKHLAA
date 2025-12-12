import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const MapRecenter = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
};

export default MapRecenter;