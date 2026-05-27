# High Confectioner — Architecture & Data Reference

## Entities (Database Schemas)

### Product
Represents an item available in the shop.

| Field | Type | Notes |
|---|---|---|
| `title` | string | **Required** |
| `description` | string | Full product description |
| `short_description` | string | Brief tagline shown on cards |
| `image_url` | string | URL of uploaded product image |
| `price` | number | Price in ZAR |
| `category` | enum | `gummies`, `baked_goods`, `chocolates`, `beverages` |
| `dosage` | string | e.g. "10mg THC" |
| `strain_type` | enum | `indica`, `sativa`, `hybrid`, `cbd_only` |
| `ingredients` | string | Full ingredients list |
| `dosing_guidelines` | string | Safety & dosing info |
| `stock_level` | number | Available stock (null = unlimited) |
| `is_visible` | boolean | Whether shown in the shop (default: true) |
| `is_featured` | boolean | Featured product flag (default: false) |

**Access Rules:**
- Only `admin` users can create, update, or delete products.
- Anyone can read visible products (`is_visible: true`); admins can read all.

---

### Order
Represents a customer purchase.

| Field | Type | Notes |
|---|---|---|
| `customer_email` | string | **Required** |
| `customer_name` | string | Customer's full name |
| `items` | array | Line items (see below) |
| `total_amount` | number | **Required** — total in ZAR |
| `status` | enum | `pending_payment` → `payment_submitted` → `processing` → `ready` → `delivered` / `cancelled` |
| `payment_method` | enum | `card_gateway` or `bank_voucher` |
| `voucher_code` | string | Bank voucher code (bank_voucher orders only) |
| `voucher_pin` | string | Bank voucher PIN (optional) |
| `voucher_type` | string | e.g. "FNB eWallet", "ABSA CashSend" |
| `delivery_method` | enum | `collection` or `delivery` |
| `delivery_address` | string | Required if delivery |
| `admin_notes` | string | Internal notes for admin |

**Order Item shape (inside `items` array):**
```json
{
  "product_id": "string",
  "product_title": "string",
  "quantity": number,
  "price": number,
  "dosage": "string"
}
```

**Access Rules:**
- Any logged-in user can create an order (recorded under their email).
- Users can only read their own orders; admins can read all.
- Only admins can update orders (e.g. change status).
- Orders cannot be deleted.

---

### CartItem
Represents a single item in a user's active shopping cart.

| Field | Type | Notes |
|---|---|---|
| `product_id` | string | **Required** — reference to Product |
| `product_title` | string | Denormalised title |
| `product_image` | string | Denormalised image URL |
| `price` | number | **Required** — price at time of adding |
| `dosage` | string | Denormalised dosage info |
| `quantity` | number | **Required** — default: 1 |

**Access Rules:**
- Any logged-in user can create, read, update, and delete their own cart items.

---

### User (built-in)
Managed by the platform. Key fields used by the app:

| Field | Notes |
|---|---|
| `id` | Auto-generated |
| `email` | Unique identifier |
| `full_name` | Set at registration |
| `role` | `admin` or `user` |

---

## Logic Workflows

### 1. Age Gate
- On first visit, a modal requires the user to confirm they are 18+.
- Confirmation is stored in `localStorage` (`ageVerified`).
- Underage users are redirected to `https://www.google.com`.
- The gate appears on every page until confirmed.

---

### 2. Authentication Flow
1. User visits `/register` → enters email + password → OTP sent to email.
2. User enters OTP → verified → token set → redirected to app.
3. Returning users log in at `/login` via email/password or Google OAuth.
4. Password reset flow: `/forgot-password` → email link → `/reset-password?token=...`.
5. Protected routes (shop, cart, checkout, profile, admin) require authentication; unauthenticated users are redirected to `/login`.

---

### 3. Shopping Flow
1. User browses `/shop` — products filtered by category, only `is_visible: true` shown.
2. User clicks a product → `/product/:id` for full detail.
3. User selects quantity and taps **Add to Cart** → `CartItem` created or quantity updated.
4. User navigates to `/cart` → reviews items, adjusts quantities, or removes items.
5. User proceeds to `/checkout`.

---

### 4. Checkout Flow
1. User selects **delivery method**: Collection or Delivery (with address).
2. User selects **payment method**: Bank Voucher.
3. For Bank Voucher: user selects provider (FNB eWallet, ABSA CashSend, etc.), enters voucher code and optional PIN.
4. On submit:
   - `Order` record is created with status `payment_submitted`.
   - All `CartItem` records for the user are deleted.
   - An email notification is sent to all admin users containing order details and a **deep link**: `/admin?order=<id>`.
5. User sees a confirmation screen.

---

### 5. Admin Order Management
1. Admin navigates to `/admin` (requires `role: admin`).
2. **Deep link support**: if URL contains `?order=<id>`, the Orders tab is auto-selected and the page scrolls to and highlights that order (green ring).
3. Admin can see all orders sorted by newest first.
4. Voucher codes/PINs are **masked by default** (`••••`); admin clicks the eye icon to reveal per order.
5. Admin can:
   - Click **Approve Payment** (shown for `bank_voucher` + `payment_submitted`) → sets status to `processing`.
   - Use the status dropdown to move an order to any status.

---

### 6. Product Management (Admin)
1. Admin navigates to `/admin` → Products tab.
2. Can create a new product via form dialog (uploads image file, fills all fields).
3. Can edit any existing product.
4. Can toggle `is_visible` directly from the product list (show/hide in shop).
5. Can delete a product.

---

## Data Relationships

```
User (1) ──────────── (many) CartItem
                              │
                              └── product_id ──► Product

User (1) ──────────── (many) Order
                              │
                              └── items[].product_id ──► Product (denormalised snapshot)
```

- **CartItem → Product**: live reference via `product_id`; title, image, price, dosage are also denormalised onto the CartItem at add-to-cart time for display performance.
- **Order → Product**: fully denormalised at checkout time — the `items` array stores a snapshot of title, price, dosage, and quantity so order history is never affected by future product edits or deletions.
- **Order → User**: linked via `created_by` (user email). Orders are read-filtered by this field for regular users.
- **CartItem → User**: linked via `created_by`. Cart is private per user.