// Production store listings shared by the homepage and campaign pages.
export const APP_DOWNLOADS = {
  ios: {
    name: "App Store",
    url: process.env.REACT_APP_APP_STORE_URL || "https://apps.apple.com/kr/app/id6759185760",
  },
  android: {
    name: "Google Play",
    url: process.env.REACT_APP_GOOGLE_PLAY_URL || "https://play.google.com/store/apps/details?id=com.plateappnew",
  },
};
