const getConfig = async () => {
  return {
    OSM_TILE_URL: process.env.OSM_TILE_URL,
    OSM_NOMINATIM_URL: process.env.OSM_NOMINATIM_URL,
    OSM_OVERPASS_ENDPOINTS: process.env.OSM_OVERPASS_ENDPOINTS ? process.env.OSM_OVERPASS_ENDPOINTS.split(',') : []
  };
};

module.exports = {
  getConfig
};
