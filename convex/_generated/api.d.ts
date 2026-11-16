/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as collections from "../collections.js";
import type * as coupons from "../coupons.js";
import type * as maintenance from "../maintenance.js";
import type * as offers from "../offers.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as push from "../push.js";
import type * as pushDelivery from "../pushDelivery.js";
import type * as sales from "../sales.js";
import type * as seedSignatures from "../seedSignatures.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  collections: typeof collections;
  coupons: typeof coupons;
  maintenance: typeof maintenance;
  offers: typeof offers;
  orders: typeof orders;
  products: typeof products;
  push: typeof push;
  pushDelivery: typeof pushDelivery;
  sales: typeof sales;
  seedSignatures: typeof seedSignatures;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
