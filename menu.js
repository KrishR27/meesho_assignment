require('dotenv').config();
const readline = require('readline');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
let token = null;
let user = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const api = async (method, path, body) => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: res.status, data: await res.json() };
  } catch {
    console.log('\n    Cannot reach server. Run: npm run dev\n');
    process.exit(1);
  }
};

const line = () => console.log('  ' + '─'.repeat(50));
const header = (t) => { console.log(); line(); console.log(`    ${t}`); line(); };



async function login() {
  header('   Meesho – Sign In');
  const email = await ask('  Email    : ');
  const password = await ask('  Password : ');
  const { status, data } = await api('POST', '/api/auth/login', { email, password });
  if (status === 200) {
    token = data.token;
    user = data;
    console.log(`\n    Welcome, ${user.name}!${user.isAdmin ? '   Admin' : ''}`);
    return true;
  }
  console.log(`\n    ${data.message}`);
  return false;
}



async function listProducts() {
  header('  All Products');
  const { data } = await api('GET', '/api/products');
  if (!data.length) {
    console.log('  No products available.');
    return [];
  }
  data.forEach((p, i) => {
    console.log(`\n  [${i + 1}]  ${p.name}`);
    console.log(`        Price      : ₹${p.price}`);
    console.log(`        In Stock   : ${p.countInStock}`);
    console.log(`        Description: ${p.description}`);
  });
  console.log();
  return data;
}


async function viewCart() {
  header('🛒  My Cart');
  const { data } = await api('GET', '/api/cart');
  if (!data.items || !data.items.length) {
    console.log('  Your cart is empty.');
    return null;
  }
  let total = 0;
  data.items.forEach((item, i) => {
    const p = item.product;
    const sub = p.price * item.qty;
    total += sub;
    console.log(`\n  [${i + 1}]  ${p.name}`);
    console.log(`        Qty      : ${item.qty}`);
    console.log(`        Price    : ₹${p.price} each`);
    console.log(`        Subtotal : ₹${sub}`);
  });
  line();
  console.log(`      Total : ₹${total}`);
  console.log();
  return data;
}

async function addToCart(products) {
  if (!products || !products.length) products = await listProducts();
  if (!products.length) return;

  const choice = await ask('  Enter product number to add: ');
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= products.length) {
    console.log('    Invalid selection.'); return;
  }

  const product = products[idx];
  const qtyStr = await ask(`  Quantity (max ${product.countInStock}): `);
  const qty = parseInt(qtyStr);
  if (isNaN(qty) || qty < 1 || qty > product.countInStock) {
    console.log('    Invalid quantity.'); return;
  }

  const { status, data } = await api('POST', '/api/cart', { productId: product._id, qty });
  if (status === 200) {
    console.log(`\n    Added ${qty}× ${product.name} to cart.`);
  } else {
    console.log(`\n    ${data.message}`);
  }
}

async function removeFromCart() {
  const cartData = await viewCart();
  if (!cartData) return;

  const choice = await ask('  Enter item number to remove (0 to cancel): ');
  if (choice.trim() === '0') return;
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= cartData.items.length) {
    console.log('    Invalid selection.'); return;
  }

  const itemId = cartData.items[idx]._id;
  const { status, data } = await api('DELETE', `/api/cart/${itemId}`);
  if (status === 200) console.log('\n    Item removed from cart.');
  else console.log(`\n    ${data.message}`);
}



async function placeOrder() {
  const { data: cartData } = await api('GET', '/api/cart');
  if (!cartData.items || !cartData.items.length) {
    console.log('\n    Your cart is empty. Add products first.'); return;
  }

  header('  Place Order – Summary');
  let total = 0;
  const orderItems = cartData.items.map((item) => {
    const sub = item.product.price * item.qty;
    total += sub;
    console.log(`    • ${item.product.name} × ${item.qty}  =  ₹${sub}`);
    return { product: item.product._id, qty: item.qty };
  });
  line();
  console.log(`      Total : ₹${total}\n`);

  const confirm = (await ask('  Confirm order? (y/n): ')).toLowerCase();
  if (confirm !== 'y') { console.log('  Cancelled.'); return; }

  const { status, data } = await api('POST', '/api/orders', { orderItems, totalPrice: total });
  if (status === 201) {
    console.log(`\n    Order placed!`);
    console.log(`      Order ID : ${data._id}`);
    console.log(`      Total    : ₹${data.totalPrice}`);
    await api('DELETE', '/api/cart');
    console.log('        Cart cleared.');
  } else {
    console.log(`\n    ${data.message}`);
  }
}

async function myOrders() {
  header('My Orders');
  const { data } = await api('GET', '/api/orders');
  if (!data.length) { console.log('  No orders yet.'); return; }

  data.forEach((order, i) => {
    console.log(`\n  [${i + 1}]  Order ID : ${order._id}`);
    console.log(`        Date   : ${new Date(order.createdAt).toLocaleString('en-IN')}`);
    console.log(`        Total  : ₹${order.totalPrice}`);
    console.log(`        Paid   : ${order.isPaid ? 'Yes' : 'No'}`);
    console.log(`        Items  :`);
    order.orderItems.forEach((item) => {
      const name = item.product?.name || '(deleted product)';
      console.log(`          – ${name} × ${item.qty}`);
    });
  });
  console.log();
}



const DUMMY_PRODUCTS = [
  { name: 'Cotton Kurta',               description: 'Comfortable everyday cotton kurta',              price: 399,  countInStock: 120 },
  { name: 'Printed Saree',              description: 'Lightweight printed chiffon saree with blouse',  price: 699,  countInStock: 80  },
  { name: 'Running Sneakers',           description: 'Lightweight mesh sneakers for running and gym',  price: 999,  countInStock: 60  },
  { name: 'Denim Jeans',                description: 'Slim-fit stretchable denim jeans for men',       price: 849,  countInStock: 75  },
  { name: 'Floral Dress',               description: 'Casual floral-print summer dress for women',     price: 549,  countInStock: 90  },
  { name: 'Wireless Earbuds',           description: 'Bluetooth 5.0 earbuds with 24hr battery',        price: 1299, countInStock: 50  },
  { name: 'Leather Wallet',             description: 'Slim genuine leather bi-fold wallet',             price: 449,  countInStock: 100 },
  { name: 'Steel Water Bottle',         description: 'Double-walled 1 litre insulated water bottle',   price: 349,  countInStock: 200 },
  { name: 'Yoga Mat',                   description: 'Anti-slip 6mm thick yoga mat with carry strap',  price: 599,  countInStock: 40  },
  { name: 'Backpack',                   description: '30L laptop backpack with USB charging port',      price: 1199, countInStock: 55  },
];

async function seedDummyProducts() {
  header(' Seeding Dummy Products');

 
  const { data: existing } = await api('GET', '/api/products');
  const existingNames = new Set(
    Array.isArray(existing) ? existing.map((p) => p.name.toLowerCase().trim()) : []
  );

  let added = 0, skipped = 0;
  for (const product of DUMMY_PRODUCTS) {
    if (existingNames.has(product.name.toLowerCase().trim())) {
      console.log(` Skipped (exists) : ${product.name}`);
      skipped++;
      continue;
    }
    const { status, data } = await api('POST', '/api/products', product);
    if (status === 201) {
      console.log(` Added : ${data.name}  (₹${data.price})`);
      added++;
    } else {
      console.log(` Failed : ${product.name} — ${data.message}`);
    }
  }
  console.log(`\n  Done. Added: ${added}  |  Skipped: ${skipped}\n`);
}



async function adminPanel() {
  while (true) {
    header('Admin Panel');
    console.log('  [1]  Add new product');
    console.log('  [2]  Delete duplicate products from DB');
    console.log('  [3]  View all products');
    console.log('  [4]  Seed 10 dummy products into DB');
    console.log('  [0]  Back');

    const choice = (await ask('\n  Choice: ')).trim();

    if (choice === '1') {
      const name        = await ask('  Product name     : ');
      const description = await ask('  Description      : ');
      const price       = parseFloat(await ask('  Price (₹)        : '));
      const countInStock = parseInt(await ask('  Stock quantity   : '));
      const image       = await ask('  Image URL (skip) : ');

      const { status, data } = await api('POST', '/api/products', {
        name, description, price, countInStock,
        ...(image.trim() && { image: image.trim() }),
      });
      if (status === 201) console.log(`\n    Product "${data.name}" created (ID: ${data._id})`);
      else console.log(`\n    ${data.message}`);

    } else if (choice === '2') {
      const { status, data } = await api('DELETE', '/api/products/duplicates');
      if (status === 200) console.log(`\n    ${data.message}`);
      else console.log(`\n    ${data.message}`);

    } else if (choice === '3') {
      await listProducts();

    } else if (choice === '4') {
      await seedDummyProducts();

    } else if (choice === '0') {
      break;
    } else {
      console.log('    Invalid option.');
    }
  }
}


async function mainMenu() {
  let products = [];

  while (true) {
    header(`   MEESHO  —  ${user.name}`);
    console.log('  [1]    Browse products');
    console.log('  [2]    Add product to cart');
    console.log('  [3]    View cart');
    console.log('  [4]     Remove item from cart');
    console.log('  [5]    Place order');
    console.log('  [6]    My orders');
    if (user.isAdmin) console.log('  [7]    Admin panel');
    console.log('  [0]    Exit');

    const choice = (await ask('\n  Choice: ')).trim();

    switch (choice) {
      case '1': products = await listProducts(); break;
      case '2': await addToCart(products); break;
      case '3': await viewCart(); break;
      case '4': await removeFromCart(); break;
      case '5': await placeOrder(); break;
      case '6': await myOrders(); break;
      case '7': if (user.isAdmin) await adminPanel(); break;
      case '0':
        console.log('\n    Goodbye!\n');
        rl.close();
        process.exit(0);
      default:
        console.log('    Invalid option. Try again.');
    }
  }
}



async function main() {
  console.clear();
  console.log('\n ');
  console.log('          Meesho Interactive CLI       ');
  console.log('  ');
  console.log('\n  Make sure the server is running: npm run dev\n');

  let loggedIn = false;
  while (!loggedIn) {
    loggedIn = await login();
    if (!loggedIn) {
      const retry = (await ask('\n  Try again? (y/n): ')).toLowerCase();
      if (retry !== 'y') { rl.close(); process.exit(0); }
    }
  }

  await mainMenu();
}

main().catch((err) => {
  console.error('\n    Unexpected error:', err.message);
  rl.close();
  process.exit(1);
});    