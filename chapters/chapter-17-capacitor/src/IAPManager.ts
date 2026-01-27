type StoreProduct = {
  id: string;
  title?: string;
  price?: string;
  owned?: boolean;
  state?: unknown;
  finish: () => void;
  className?: string;
  raw?: {
    price?: string;
    [key: string]: unknown;
  };
  offers?: Array<{
    pricingPhases?: Array<{
      price?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
};

type Store = {
  register: (product: { id: string; type: unknown; platform: unknown }) => void;
  when: (id: string) => {
    approved: (cb: (product: StoreProduct) => void) => void;
    verified?: (cb: (product: StoreProduct) => void) => void;
    owned?: (cb: (product: StoreProduct) => void) => void;
    updated?: (cb: (product: StoreProduct) => void) => void;
  };
  get: (id: string) => StoreProduct | undefined;
  ready: (cb: () => void) => void;
  error: (cb: (err: unknown) => void) => void;
  refresh: () => void;
  order: (id: string) => void;
};

type CdvPurchaseGlobal = {
  store: Store;
  ProductType: { NON_CONSUMABLE: unknown };
  Platform: { APPLE_APPSTORE: unknown };
};

export type IAPState = {
  available: boolean;
  owned: boolean;
  price?: string;
  title?: string;
  state?: unknown;
  canPurchase?: boolean;
  isProcessing?: boolean;
  lastError?: string;
  lastSuccess?: string;
};

export class IAPManager {
  private productId: string;
  private state: IAPState = { available: false, owned: false };
  private onChange?: (state: IAPState) => void;
  private storeReady = false;

  constructor(productId: string) {
    this.productId = productId;
  }

  init(onChange?: (state: IAPState) => void): void {
    this.onChange = onChange;
    console.log('[IAP] Initializing IAPManager...');
    console.log('[IAP] Initial state before plugin check:', {
      owned: this.state.owned,
      available: this.state.available
    });
    const purchase = (window as unknown as { CdvPurchase?: CdvPurchaseGlobal }).CdvPurchase;
    if (!purchase?.store) {
      console.warn('[IAP] CdvPurchase not available');
      this.updateState({ available: false });
      return;
    }

    console.log('[IAP] CdvPurchase found, registering product:', this.productId);
    const store = purchase.store;
    store.register({
      id: this.productId,
      type: purchase.ProductType.NON_CONSUMABLE,
      platform: purchase.Platform.APPLE_APPSTORE,
    });

    store.when(this.productId).approved((product) => {
      console.log('[IAP] PURCHASE APPROVED!', { id: product.id, title: product.title, price: product.price, owned: product.owned, state: product.state });
      console.log('[IAP] Calling product.finish() to complete transaction');
      product.finish();
      this.updateState({
        ...this.buildProductState(product, { owned: true, available: true, canPurchase: true }),
        isProcessing: false,
        lastSuccess: 'Purchase completed successfully!',
        lastError: undefined
      });
      console.log('[IAP] Purchase completed and product marked as owned');
    });

    // Add verified listener for non-consumable products
    if (store.when(this.productId).verified) {
      store.when(this.productId).verified!((product) => {
        console.log('[IAP] VERIFIED - Transaction verified by server', {
          id: product.id,
          title: product.title,
          price: product.price,
          owned: product.owned,
          state: product.state
        });
        console.log('[IAP] Finishing verified transaction');
        product.finish();
        this.updateState(this.buildProductState(product, { owned: true, available: true, canPurchase: true }));
      });
    }

    // Add valid listener - this is important for purchase availability
    const whenProduct = store.when(this.productId);
    if ((whenProduct as any).valid) {
      (whenProduct as any).valid((product: StoreProduct) => {
        console.log('[IAP] Product is valid:', { id: product.id, state: product.state });
        this.updateState(
          this.buildProductState(product, {
            owned: !!product.owned,
            available: true,
            canPurchase: true,
          }),
        );
      });
    }

    // Add receipt updated listener to track restore
    const storeWithReceipt = store as any;
    if (storeWithReceipt.when) {
      const receipt = storeWithReceipt.when('receipt');
      if (receipt && receipt.updated) {
        receipt.updated((r: any) => {
          console.log('[IAP] Receipt updated:', {
            hasTransactions: r?.transactions?.length > 0,
            transactions: r?.transactions?.map((t: any) => ({
              id: t.transactionId,
              productId: t.products?.[0]?.id,
              state: t.state
            }))
          });

          // Check if our product is in the receipt
          const hasOurProduct = r?.transactions?.some((t: any) =>
            t.products?.some((p: any) => p.id === this.productId) &&
            (t.state === 'approved' || t.state === 'finished')
          );

          if (hasOurProduct) {
            console.log('[IAP] FOUND OWNED PRODUCT IN RECEIPT!');
            this.updateState({ owned: true });
          }
        });
      }
    }

    if (store.when(this.productId).owned) {
      store.when(this.productId).owned!((product) => {
        console.log('[IAP] PRODUCT OWNED (from restore or previous purchase)!', {
          id: product.id,
          title: product.title,
          price: product.price,
          owned: product.owned,
          state: product.state
        });
        this.updateState(this.buildProductState(product, { owned: true, available: true, canPurchase: true }));
        console.log('[IAP] Product ownership restored successfully');
      });
    }

    if (store.when(this.productId).updated) {
      store.when(this.productId).updated!((product) => {
        console.log('[IAP] updated', {
          id: product.id,
          title: product.title,
          price: product.price,
          owned: product.owned,
          state: product.state,
          className: product.className,
          fullProduct: product
        });

        // Skip Receipt objects in updates
        if (product.className === 'Receipt') {
          console.log('[IAP] Skipping Receipt update');
          return;
        }

        this.updateState(
          this.buildProductState(product, {
            owned: !!product.owned,
            available: true,
            canPurchase: this.isPurchasable(product),
          }),
        );
      });
    }

    store.error((err: any) => {
      console.warn('[IAP] store error', err);
      const errorMessage = err?.message || 'An error occurred. Please try again.';
      this.updateState({
        isProcessing: false,
        lastError: errorMessage,
        lastSuccess: undefined
      });
    });

    store.ready(() => {
      console.log('[IAP] Store is ready');
      this.storeReady = true;

      const product = store.get(this.productId);
      console.log('[IAP] ready', product ? {
        id: product.id,
        title: product.title,
        price: product.price,
        owned: product.owned,
        state: product.state,
        fullProduct: product
      } : 'no product');
      if (!product) {
        this.updateState({ available: false });
        return;
      }
      this.updateState(
        this.buildProductState(product, {
          owned: !!product.owned,
          available: true,
          canPurchase: this.isPurchasable(product),
        }),
      );
    });

    const anyStore = store as Store & { initialize?: (platforms: unknown[]) => Promise<void>; update?: () => void };
    if (typeof anyStore.initialize === 'function') {
      void anyStore.initialize([purchase.Platform.APPLE_APPSTORE]).then(() => {
        if (typeof anyStore.update === 'function') {
          anyStore.update();
        } else {
          store.refresh();
        }
      });
    } else {
      if (typeof anyStore.update === 'function') {
        anyStore.update();
      } else {
        store.refresh();
      }
    }
  }

  purchase(): void {
    console.log('[IAP] Purchase requested for:', this.productId);

    // Check if already processing
    if (this.state.isProcessing) {
      console.warn('[IAP] Already processing a transaction');
      return;
    }

    // Check if already owned
    if (this.state.owned) {
      console.warn('[IAP] Product already owned! Attempting restore instead.');
      this.restore();
      return;
    }

    const purchase = (window as unknown as { CdvPurchase?: CdvPurchaseGlobal }).CdvPurchase;
    if (!purchase?.store) {
      console.error('[IAP] Store not available');
      this.updateState({
        lastError: 'Store not available. Please try again later.',
        isProcessing: false
      });
      return;
    }

    if (!this.storeReady) {
      console.error('[IAP] Store not ready yet');
      this.updateState({
        lastError: 'Store is loading. Please try again in a moment.',
        isProcessing: false
      });
      return;
    }

    // Set processing state
    this.updateState({
      isProcessing: true,
      lastError: undefined,
      lastSuccess: undefined
    });

    const product = purchase.store.get(this.productId);
    console.log('[IAP] Product from store.get():', product);

    if (!product) {
      console.error('[IAP] Product not found in store:', this.productId);
      // Try to refresh and get again
      purchase.store.refresh();
      return;
    }

    // Check product ownership status
    const anyProduct = product as any;
    if (anyProduct.owned === true) {
      console.warn('[IAP] Product shows as owned in store! Updating state.');
      this.updateState({ owned: true });
      return;
    }

    if (!this.state.canPurchase) {
      console.warn('[IAP] Purchase blocked: product not valid yet', { state: this.state });
      return;
    }

    // Try different purchase methods
    console.log('[IAP] Attempting purchase...');

    // Method 1: Try to find the default offer and order it
    if (anyProduct.offers && anyProduct.offers.length > 0) {
      const offer = anyProduct.offers[0];
      console.log('[IAP] Found offer:', offer);
      if (typeof offer.order === 'function') {
        console.log('[IAP] Using offer.order()');
        offer.order();
        return;
      }
    }

    // Method 2: Try getOffer method
    if (typeof anyProduct.getOffer === 'function') {
      const offer = anyProduct.getOffer();
      console.log('[IAP] Got offer from getOffer():', offer);
      if (offer && typeof offer.order === 'function') {
        console.log('[IAP] Using offer.order() from getOffer');
        offer.order();
        return;
      }
    }

    // Method 3: Fallback to store.order
    console.log('[IAP] Using store.order() fallback');
    purchase.store.order(this.productId);
  }

  restore(): void {
    console.log('[IAP] Restore purchases requested');

    // Check if already processing
    if (this.state.isProcessing) {
      console.warn('[IAP] Already processing a transaction');
      return;
    }

    const purchase = (window as unknown as { CdvPurchase?: CdvPurchaseGlobal }).CdvPurchase;
    if (!purchase?.store) {
      console.error('[IAP] Store not available for restore');
      this.updateState({
        lastError: 'Store not available. Please try again later.',
        isProcessing: false
      });
      return;
    }

    if (!this.storeReady) {
      console.error('[IAP] Store not ready yet, cannot restore');
      this.updateState({
        lastError: 'Store is loading. Please try again in a moment.',
        isProcessing: false
      });
      return;
    }

    // Set processing state
    this.updateState({
      isProcessing: true,
      lastError: undefined,
      lastSuccess: undefined
    });

    console.log('[IAP] Starting restore process...');

    // For CdvPurchase v13, the restore is actually handled by refreshing the receipt
    // The plugin will automatically detect owned products
    const anyStore = purchase.store as any;

    // Set a timeout to handle cases where restore doesn't complete
    const restoreTimeout = setTimeout(() => {
      if (this.state.isProcessing) {
        console.log('[IAP] Restore timeout - checking final state');
        if (!this.state.owned) {
          this.updateState({
            isProcessing: false,
            lastError: 'No purchases found to restore.',
            lastSuccess: undefined
          });
        }
      }
    }, 10000); // 10 second timeout

    // Store original owned state to detect changes
    const wasOwned = this.state.owned;

    // Method 1: Try restorePurchases if available
    if (typeof anyStore.restorePurchases === 'function') {
      console.log('[IAP] Using store.restorePurchases()');
      anyStore.restorePurchases();

      // Also refresh to ensure we get the latest state
      setTimeout(() => {
        console.log('[IAP] Refreshing store after restore...');
        purchase.store.refresh();

        // Check if ownership changed
        setTimeout(() => {
          clearTimeout(restoreTimeout);
          if (this.state.owned && !wasOwned) {
            this.updateState({
              isProcessing: false,
              lastSuccess: 'Purchases restored successfully!',
              lastError: undefined
            });
          } else if (this.state.isProcessing) {
            this.updateState({
              isProcessing: false,
              lastError: wasOwned ? 'Already owned.' : 'No purchases found to restore.',
              lastSuccess: undefined
            });
          }
        }, 2000);
      }, 1000);
    } else {
      // Method 2: Just refresh - this should trigger receipt validation
      console.log('[IAP] Using store.refresh() for restore');
      purchase.store.refresh();

      setTimeout(() => {
        clearTimeout(restoreTimeout);
        if (this.state.owned && !wasOwned) {
          this.updateState({
            isProcessing: false,
            lastSuccess: 'Purchases restored successfully!',
            lastError: undefined
          });
        }
      }, 3000);
    }

    console.log('[IAP] Restore initiated. Watch for [IAP] PRODUCT OWNED messages...');
  }

  getState(): IAPState {
    return { ...this.state };
  }

  isOwned(): boolean {
    return this.state.owned;
  }

  getPriceLabel(): string | undefined {
    return this.state.price;
  }

  getTitle(): string | undefined {
    return this.state.title;
  }

  // Testing method to simulate lost purchase
  clearOwnershipForTesting(): void {
    console.log('[IAP] Clearing ownership for testing (this won\'t affect App Store records)');
    this.updateState({ owned: false });
  }

  // Force refresh the store state from Apple servers
  forceRefresh(): void {
    console.log('[IAP] Force refreshing store state from Apple servers...');
    const purchase = (window as unknown as { CdvPurchase?: CdvPurchaseGlobal }).CdvPurchase;
    if (purchase?.store) {
      // First clear the owned state locally
      this.updateState({ owned: false, isProcessing: true });
      // Then refresh from Apple
      purchase.store.refresh();
      // The owned state will be updated via the listeners if still valid
      setTimeout(() => {
        this.updateState({ isProcessing: false });
      }, 3000);
    }
  }

  private updateState(partial: Partial<IAPState>): void {
    this.state = { ...this.state, ...partial };
    this.onChange?.(this.state);
  }

  private buildProductState(product: StoreProduct, overrides: Partial<IAPState>): Partial<IAPState> {
    // Extract price from different possible locations
    const price = product.price ||
                  product.raw?.price ||
                  product.offers?.[0]?.pricingPhases?.[0]?.price ||
                  this.state.price;

    return {
      available: overrides.available ?? this.state.available,
      owned: overrides.owned ?? this.state.owned,
      state: overrides.state ?? product.state ?? this.state.state,
      canPurchase: overrides.canPurchase ?? this.state.canPurchase,
      price: price,
      title: product.title ?? this.state.title,
    };
  }

  private isPurchasable(product?: StoreProduct): boolean {
    // Skip Receipt objects
    if (product?.className === 'Receipt') {
      console.log('[IAP] Skipping Receipt object');
      return false;
    }

    const state = product?.state;
    console.log('[IAP] Checking if purchasable, state:', state, 'className:', product?.className);

    // Check for price in different locations
    const hasPrice = !!(
      product?.price ||
      product?.raw?.price ||
      product?.offers?.[0]?.pricingPhases?.[0]?.price
    );

    // If we have a Product with title and price but no state, consider it purchasable
    if (product && product.className === 'Product' && product.title && hasPrice && (state === undefined || state === null)) {
      console.log('[IAP] Product has title and price but no state, marking as purchasable');
      return true;
    }

    if (state === undefined || state === null) return false;

    if (typeof state === 'string') {
      const normalized = state.toUpperCase();
      const purchasable = normalized === 'VALID' || normalized === 'APPROVED' || normalized === 'OWNED' || normalized === 'REGISTERED';
      console.log('[IAP] String state', normalized, 'purchasable:', purchasable);
      return purchasable;
    }

    if (typeof state === 'number') {
      // CdvPurchase state codes: REGISTERED=0, INVALID=1, VALID=2, REQUESTED=3, INITIATED=4, APPROVED=5, OWNED=6
      const purchasable = state >= 2 && state <= 6;
      console.log('[IAP] Numeric state', state, 'purchasable:', purchasable);
      return purchasable;
    }

    return false;
  }
}
