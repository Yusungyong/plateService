// The operator will provide the final store links. Empty URLs open installation help.
export const APP_DOWNLOADS = {
  ios: {
    name: "App Store",
    url: process.env.REACT_APP_APP_STORE_URL || "",
  },
  android: {
    name: "Google Play",
    url: process.env.REACT_APP_GOOGLE_PLAY_URL || "",
  },
};
