require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const { errorHandler } = require('./middleware/errorMiddleware');
const { sendResponse } = require('./utils/responseHandler');

const app = express();
const port = process.env.PORT;
let apiPrefix = (process.env.API_PREFIX).trim();
if (!apiPrefix.startsWith('/')) {
  apiPrefix = '/' + apiPrefix;
}

app.use(cors());
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_PAYLOAD_SIZE }));

app.get(`${apiPrefix}/`, (req, res) => {
  sendResponse(res, 200, { message: 'Hola Mundo - Backend API' });
});

app.get(`${apiPrefix}/config`, (req, res) => {
  sendResponse(res, 200, {
    OSM_TILE_URL: process.env.OSM_TILE_URL,
    OSM_NOMINATIM_URL: process.env.OSM_NOMINATIM_URL,
    OSM_OVERPASS_ENDPOINTS: process.env.OSM_OVERPASS_ENDPOINTS ? process.env.OSM_OVERPASS_ENDPOINTS.split(',') : []
  });
});

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/projects`, projectRoutes);

// Catch-all 404
app.use(apiPrefix, (req, res) => {
  sendResponse(res, 404, null, { message: 'Endpoint no encontrado' });
});

// Error handler global
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
