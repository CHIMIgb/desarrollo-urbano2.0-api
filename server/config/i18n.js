const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'es',
    preload: ['es', 'en'],
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/translation.json')
    },
    detection: {
      order: ['header'], // Detectar por la cabecera Accept-Language
      caches: false
    }
  });

module.exports = i18next;
