const fs = require('fs');
const path = require('path');

/**
 * app.json stays the main config. Push notifications on Android need Firebase's
 * `google-services.json`; it is added here only when the file exists, so the project still builds
 * (without remote push) before that file is in place. The file is not secret enough to be a
 * password but is project configuration: keep it out of public repositories.
 */
module.exports = ({ config }) => {
  const file = path.join(__dirname, 'google-services.json');
  if (!fs.existsSync(file)) return config;
  return {
    ...config,
    android: { ...config.android, googleServicesFile: './google-services.json' },
  };
};
