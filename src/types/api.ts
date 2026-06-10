// Hand-written types mirroring the backend Pydantic schemas.
// This is the contract the whole frontend depends on — keep it exact.

export type Role = "admin" | "editor" | "viewer";
export type ReadingStatus = "to_read" | "reading" | "read";
export type Lang = "en" | "it" | "es" | "fr";
// Must match the backend DB enums (catalog enums.py) exactly.
export type BookCondition = "new" | "good" | "fair" | "poor";
export type BookSource = "purchased" | "gift" | "borrowed" | "other";

// ----- Auth -----

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface RegisterRequest {
  family_name: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
}

export interface RegisterResponse {
  family_id: string;
  user_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// Claims encoded in the JWT access token.
export interface JwtClaims {
  sub: string; // user_id
  email: string;
  family_id: string;
  role: Role;
  exp: number; // seconds since epoch
}

// ----- Users & Family -----

export interface User {
  id: string;
  family_id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  annual_reading_goal: number | null;
  language: Lang | null;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  role: Role;
}

export interface UserUpdate {
  full_name?: string;
  role?: Role;
  is_active?: boolean;
  annual_reading_goal?: number | null;
}

export interface MeUpdate {
  full_name?: string;
  annual_reading_goal?: number | null;
  language?: Lang | null;
}

export interface Family {
  id: string;
  name: string;
  description: string | null;
}

export interface FamilyUpdate {
  name?: string;
  description?: string;
}

// ----- Catalog: records & books -----

export interface BibliographicRecord {
  id: string;
  family_id: string;
  title: string;
  main_author: string | null;
  other_authors: string[];
  isbn: string | null;
  publisher: string | null;
  publication_year: number | null;
  language: string | null;
  genre: string | null;
  cover_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BibliographicRecordCreate {
  title: string;
  main_author?: string | null;
  other_authors?: string[] | null;
  isbn?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  notes?: string | null;
}

export type BibliographicRecordUpdate = Partial<BibliographicRecordCreate>;

export interface OwnedBook {
  id: string;
  family_id: string;
  bibliographic_record_id: string;
  room_id: string | null;
  bookcase_id: string | null;
  section_id: string | null;
  shelf_id: string | null;
  shelf_position: number | null;
  condition: string | null;
  purchase_date: string | null;
  purchase_price: string | null;
  source: string | null;
  reading_status: ReadingStatus;
  current_reader_id: string | null;
  owner_id: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface OwnedBookCreate {
  bibliographic_record_id?: string;
  title?: string;
  main_author?: string;
  isbn?: string;
  room_id?: string;
  bookcase_id?: string;
  section_id?: string;
  shelf_id?: string;
  shelf_position?: number;
  condition?: BookCondition;
  purchase_date?: string;
  purchase_price?: number;
  source?: BookSource;
  reading_status?: ReadingStatus;
  owner_id?: string;
  notes?: string;
  tags?: string[];
}

export interface OwnedBookUpdate {
  room_id?: string | null;
  bookcase_id?: string | null;
  section_id?: string | null;
  shelf_id?: string | null;
  shelf_position?: number | null;
  condition?: BookCondition | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  source?: BookSource | null;
  reading_status?: ReadingStatus | null;
  owner_id?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

export interface BookRead {
  owned_book_id: string;
  user_id: string;
  read_at: string;
}

export interface BookLoan {
  id: string;
  owned_book_id: string;
  borrower_name: string;
  loaned_at: string;
  due_date: string | null;
  returned_at: string | null;
}

export interface BookLoanCreate {
  borrower_name: string;
  due_date?: string | null;
}

// The joined view the UI actually renders.
export interface BookView {
  book: OwnedBook;
  record: BibliographicRecord | null;
}

// ----- ISBN ingestion -----

export interface IsbnLookupResponse {
  source: string;
  metadata: Record<string, unknown>;
  cached: boolean;
}

// ----- Locations -----

export interface Room {
  id: string;
  family_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomCreate {
  name: string;
  description?: string | null;
}
export type RoomUpdate = Partial<RoomCreate>;

export interface Bookcase {
  id: string;
  room_id: string;
  family_id: string;
  name: string;
  description: string | null;
  type: string | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookcaseCreate {
  room_id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  notes?: string | null;
  image_url?: string | null;
}
export type BookcaseUpdate = Partial<BookcaseCreate>;

export interface Section {
  id: string;
  bookcase_id: string;
  section_index: number;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionCreate {
  bookcase_id: string;
  section_index: number;
  label?: string | null;
}
export type SectionUpdate = Partial<SectionCreate>;

export interface Shelf {
  id: string;
  section_id: string;
  shelf_index: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShelfCreate {
  section_id: string;
  shelf_index: number;
  notes?: string | null;
}
export type ShelfUpdate = Partial<ShelfCreate>;

// ----- Bookcase map -----

export interface BookOnShelf {
  id: string;
  title: string | null;
  main_author: string | null;
  reading_status: ReadingStatus;
}

export interface ShelfMap {
  shelf_id: string;
  shelf_index: number;
  books: BookOnShelf[];
}

export interface SectionMap {
  section_id: string;
  section_index: number;
  label: string | null;
  shelves: ShelfMap[];
}

export interface BookcaseMap {
  bookcase_id: string;
  bookcase_name: string;
  sections: SectionMap[];
}
