// Public API paths as exposed by the API Gateway.
//
// Gateway routing (verified against the backend, all endpoints validated):
//   /v1/auth/{path}     → auth-service     /v1/auth/{path}
//   /v1/users/{path}    → auth-service     /v1/users/{path}
//   /v1/families/{path} → auth-service     /v1/families/{path}
//   /v1/catalog/{path}  → catalog-service  /v1/{path}
//   /v1/location/{path} → catalog-service  /v1/{path}   (same service, semantic split)

export const AUTH = "v1/auth";

// Catalog domain
export const BOOKS = "v1/catalog/books";
export const RECORDS = "v1/catalog/bibliographic-records"; // NOT /records
export const INGESTION = "v1/catalog/ingestion";
export const MAP = "v1/catalog/map";
export const EXPORT = "v1/catalog/export";
export const CATALOG_IMPORT = "v1/catalog/import";
export const CATALOG_MEMBERS = "v1/catalog/members";

// AI domain — gateway proxies /v1/ai/{path} → ai-service /v1/suggestions/{path}
export const AI = "v1/ai";

// Location domain (same backend service, different gateway prefix)
export const ROOMS = "v1/location/rooms";
export const BOOKCASES = "v1/location/bookcases";
export const SECTIONS = "v1/location/sections";
export const SHELVES = "v1/location/shelves";

// Auth domain — user/family management (proxied by the gateway)
export const USERS = "v1/users";
export const FAMILIES = "v1/families";
