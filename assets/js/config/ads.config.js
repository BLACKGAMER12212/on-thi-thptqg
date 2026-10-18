export const ADS_CONFIG = Object.freeze({
  enabled: true,
  closedStorageKey: "thpt_corner_ad_closed",
  selectors: Object.freeze({
    allSlots: "[data-ad-slot]",
    sideSlots: ".ad-banner-side",
    cornerSlot: "#corner-ad",
  }),
  placements: Object.freeze({
    sideLeft: Object.freeze({
      name: "side-left",
      format: "160x600",
    }),
    sideRight: Object.freeze({
      name: "side-right",
      format: "160x600",
    }),
    corner: Object.freeze({
      name: "corner",
      format: "300x150",
    }),
  }),
});
