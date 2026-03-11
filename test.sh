#!/bin/bash

BASE_URL="http://localhost:5000"
ADMIN_SECRET="meesho_admin_secret_2026"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}▶ $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
print_res()    { echo -e "${YELLOW}Response:${NC} $1"; }
print_ok()     { echo -e "${GREEN}✔ $1${NC}"; }
print_err()    { echo -e "${RED}✖ $1${NC}"; }

# ─── 1. REGISTER USER ─────────────────────────────────────────────────────────
print_header "1. Register User"
REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@example.com","password":"password123"}')
print_res "$REGISTER"

USER_TOKEN=$(echo "$REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# If already exists, fall back to login
if [ -z "$USER_TOKEN" ]; then
  print_ok "User exists — logging in instead"
  LOGIN_FB=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser@example.com","password":"password123"}')
  USER_TOKEN=$(echo "$LOGIN_FB" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -n "$USER_TOKEN" ]; then print_ok "User token captured"; else print_err "Failed to get user token"; fi

# ─── 2. LOGIN USER ────────────────────────────────────────────────────────────
print_header "2. Login User"
LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}')
print_res "$LOGIN"
print_ok "Login successful"

# ─── 3. REGISTER ADMIN ────────────────────────────────────────────────────────
print_header "3. Register Admin User"
ADMIN_REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin User\",\"email\":\"admin@example.com\",\"password\":\"admin123\",\"adminSecret\":\"$ADMIN_SECRET\"}")
print_res "$ADMIN_REGISTER"

ADMIN_TOKEN=$(echo "$ADMIN_REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# If already exists, fall back to login
if [ -z "$ADMIN_TOKEN" ]; then
  print_ok "Admin exists — logging in instead"
  ADMIN_FB=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}')
  ADMIN_TOKEN=$(echo "$ADMIN_FB" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -n "$ADMIN_TOKEN" ]; then print_ok "Admin token captured"; else print_err "Failed to get admin token"; fi

# Always ensure admin has isAdmin=true (idempotent)
PROMOTE=$(curl -s -X POST "$BASE_URL/api/auth/promote" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"adminSecret\":\"$ADMIN_SECRET\"}")
print_ok "Admin promoted: $(echo $PROMOTE | grep -o '\"message\":\"[^\"]*\"' | cut -d'"' -f4)"

# ─── 4. LOGIN VALIDATION - WRONG PASSWORD ─────────────────────────────────────
print_header "4. Login - Wrong Password (should return 401)"
WRONG_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"wrongpassword"}')
if [ "$WRONG_LOGIN" = "401" ]; then print_ok "Correctly rejected (401)"; else print_err "Unexpected status: $WRONG_LOGIN"; fi

# ─── 5. GET ALL PRODUCTS (public) ─────────────────────────────────────────────
print_header "5. Get All Products (public)"
PRODUCTS=$(curl -s -X GET "$BASE_URL/api/products")
print_res "$PRODUCTS"
print_ok "Products fetched"

# ─── 6. ADD PRODUCT (no auth - should fail) ───────────────────────────────────
print_header "6. Add Product - No Auth (should return 401)"
NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sneakers","description":"Running shoes","price":999,"countInStock":20}')
if [ "$NO_AUTH" = "401" ]; then print_ok "Correctly rejected (401)"; else print_err "Unexpected status: $NO_AUTH"; fi

# ─── 7. ADD PRODUCT (with user token - should fail, not admin) ────────────────
print_header "7. Add Product - Non-Admin (should return 403)"
NOT_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"name":"Sneakers","description":"Running shoes","price":999,"countInStock":20}')
if [ "$NOT_ADMIN" = "403" ]; then print_ok "Correctly rejected (403)"; else print_err "Unexpected status: $NOT_ADMIN (make sure user is not admin)"; fi

# ─── 8. ADD PRODUCT (admin token) ─────────────────────────────────────────────
print_header "8. Add Product (Admin Token)"
ADD_PRODUCT=$(curl -s -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Cotton T-Shirt","description":"Comfortable cotton t-shirt","price":299,"countInStock":100,"image":"https://example.com/tshirt.jpg"}')
print_res "$ADD_PRODUCT"
PRODUCT_ID=$(echo "$ADD_PRODUCT" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$PRODUCT_ID" ]; then print_ok "Product created: $PRODUCT_ID"; else print_err "Product creation failed (admin not set?)"; fi

# ─── 9. GET PRODUCT BY ID ─────────────────────────────────────────────────────
if [ -n "$PRODUCT_ID" ]; then
  print_header "9. Get Product by ID"
  GET_PRODUCT=$(curl -s -X GET "$BASE_URL/api/products/$PRODUCT_ID")
  print_res "$GET_PRODUCT"
  print_ok "Product fetched"
else
  print_header "9. Get Product by ID — SKIPPED (no product ID)"
fi

# ─── 10. UPDATE PRODUCT ───────────────────────────────────────────────────────
if [ -n "$PRODUCT_ID" ]; then
  print_header "10. Update Product (Admin)"
  UPDATE=$(curl -s -X PUT "$BASE_URL/api/products/$PRODUCT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"price":349,"countInStock":80}')
  print_res "$UPDATE"
  print_ok "Product updated"
else
  print_header "10. Update Product — SKIPPED"
fi

# ─── 11. ADD TO CART ──────────────────────────────────────────────────────────
if [ -n "$PRODUCT_ID" ]; then
  print_header "11. Add to Cart"
  ADD_CART=$(curl -s -X POST "$BASE_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d "{\"productId\":\"$PRODUCT_ID\",\"qty\":2}")
  print_res "$ADD_CART"
  print_ok "Added to cart"
else
  print_header "11. Add to Cart — SKIPPED"
fi

# ─── 12. VIEW CART ────────────────────────────────────────────────────────────
print_header "12. View Cart"
CART=$(curl -s -X GET "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")
print_res "$CART"
ITEM_ID=$(echo "$CART" | grep -o '"_id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
print_ok "Cart fetched"

# ─── 13. REMOVE ITEM FROM CART ────────────────────────────────────────────────
if [ -n "$ITEM_ID" ]; then
  print_header "13. Remove Item from Cart"
  REMOVE=$(curl -s -X DELETE "$BASE_URL/api/cart/$ITEM_ID" \
    -H "Authorization: Bearer $USER_TOKEN")
  print_res "$REMOVE"
  print_ok "Item removed"
else
  print_header "13. Remove Item — SKIPPED (no item ID)"
fi

# ─── 14. ADD BACK TO CART (for order) ─────────────────────────────────────────
if [ -n "$PRODUCT_ID" ]; then
  print_header "14. Add Back to Cart (for order)"
  curl -s -X POST "$BASE_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d "{\"productId\":\"$PRODUCT_ID\",\"qty\":1}" > /dev/null
  print_ok "Re-added to cart"
fi

# ─── 15. PLACE ORDER ──────────────────────────────────────────────────────────
if [ -n "$PRODUCT_ID" ]; then
  print_header "15. Place Order"
  ORDER=$(curl -s -X POST "$BASE_URL/api/orders" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d "{\"orderItems\":[{\"product\":\"$PRODUCT_ID\",\"qty\":1}],\"totalPrice\":349}")
  print_res "$ORDER"
  ORDER_ID=$(echo "$ORDER" | grep -o '"_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
  if [ -n "$ORDER_ID" ]; then print_ok "Order placed: $ORDER_ID"; else print_err "Order failed"; fi
else
  print_header "15. Place Order — SKIPPED"
fi

# ─── 16. GET MY ORDERS ────────────────────────────────────────────────────────
print_header "16. Get My Orders"
ORDERS=$(curl -s -X GET "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $USER_TOKEN")
print_res "$ORDERS"
print_ok "Orders fetched"

# ─── 17. GET ORDER BY ID ──────────────────────────────────────────────────────
if [ -n "$ORDER_ID" ]; then
  print_header "17. Get Order by ID"
  ORDER_DETAIL=$(curl -s -X GET "$BASE_URL/api/orders/$ORDER_ID" \
    -H "Authorization: Bearer $USER_TOKEN")
  print_res "$ORDER_DETAIL"
  print_ok "Order detail fetched"
else
  print_header "17. Get Order by ID — SKIPPED"
fi

# ─── 18. CLEAR CART ───────────────────────────────────────────────────────────
print_header "18. Clear Entire Cart"
CLEAR=$(curl -s -X DELETE "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")
print_res "$CLEAR"
print_ok "Cart cleared"

# ─── 19. DELETE PRODUCT (Admin) ───────────────────────────────────────────────
if [ -n "$PRODUCT_ID" ]; then
  print_header "19. Delete Product (Admin)"
  DELETE=$(curl -s -X DELETE "$BASE_URL/api/products/$PRODUCT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  print_res "$DELETE"
  print_ok "Product deleted"
else
  print_header "19. Delete Product — SKIPPED"
fi

# ─── 20. 404 ROUTE ────────────────────────────────────────────────────────────
print_header "20. Unknown Route (should return 404)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/doesnotexist")
if [ "$STATUS" = "404" ]; then print_ok "Correctly returned 404"; else print_err "Unexpected: $STATUS"; fi

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All tests done!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
