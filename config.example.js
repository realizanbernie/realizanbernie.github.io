/* Future integration settings. Copy to config.js when your backend is ready.
   Never put private API keys, database passwords, or service-role keys in frontend code. */
window.FPC_CONFIG = {
  // Example: "http://localhost:3000/api" for local development.
  // Production should use HTTPS and a restricted, authenticated API.
  apiBaseUrl: "",
  // Example map integration placeholder. Restrict public map keys by domain/API.
  mapProvider: "none",
  mapPublicKey: "",
  // Optional future integrations:
  integrations: {
    oltSnmp: false,
    onuManagement: false,
    fieldMeasurements: false,
    cloudSync: false
  }
};
