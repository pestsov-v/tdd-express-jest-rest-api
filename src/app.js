const express = require('express');
const userRoute = require('../src/user/userRoutes');
const i18next = require('i18next');
const backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18next
  .use(backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

/// refacto
const app = express();

app.use(express.json());
app.use(middleware.handle(i18next));

app.use(userRoute);

console.log('env: ' + process.env.NODE_ENV);

module.exports = app;
