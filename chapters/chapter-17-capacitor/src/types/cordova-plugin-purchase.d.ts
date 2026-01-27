interface Window {
  CdvPurchase?: {
    store: {
      register: (product: { id: string; type: unknown; platform: unknown }) => void;
      when: (id: string) => {
        approved: (cb: (product: { id: string; price?: string; owned?: boolean; finish: () => void }) => void) => void;
        verified?: (cb: (product: { id: string; price?: string; owned?: boolean; finish: () => void }) => void) => void;
        owned?: (cb: (product: { id: string; price?: string; owned?: boolean; finish: () => void }) => void) => void;
        updated?: (cb: (product: { id: string; price?: string; owned?: boolean; finish: () => void }) => void) => void;
      };
      get: (id: string) => { id: string; price?: string; owned?: boolean } | undefined;
      ready: (cb: () => void) => void;
      error: (cb: (err: unknown) => void) => void;
      refresh: () => void;
      order: (id: string) => void;
    };
    ProductType: { NON_CONSUMABLE: unknown };
    Platform: { APPLE_APPSTORE: unknown };
  };
}
