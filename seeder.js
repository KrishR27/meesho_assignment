require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');
const bcrypt = require('bcrypt');

const products = [
  {
    name: 'Cotton Kurta',
    description: 'Comfortable everyday cotton kurta for men and women',
    price: 399,
    countInStock: 120,
    image: 'https://images.meesho.com/images/products/cotton-kurta.jpg',
  },
  {
    name: 'Printed Saree',
    description: 'Lightweight printed chiffon saree with blouse piece',
    price: 699,
    countInStock: 80,
    image: 'https://images.meesho.com/images/products/printed-saree.jpg',
  },
  {
    name: 'Running Sneakers',
    description: 'Lightweight mesh sneakers ideal for running and gym',
    price: 999,
    countInStock: 60,
    image: 'https://images.meesho.com/images/products/sneakers.jpg',
  },
  {
    name: 'Denim Jeans',
    description: 'Slim-fit stretchable denim jeans for men',
    price: 849,
    countInStock: 75,
    image: 'https://images.meesho.com/images/products/denim-jeans.jpg',
  },
  {
    name: 'Floral Dress',
    description: 'Casual floral-print summer dress for women',
    price: 549,
    countInStock: 90,
    image: 'https://images.meesho.com/images/products/floral-dress.jpg',
  },
  {
    name: 'Wireless Earbuds',
    description: 'Bluetooth 5.0 earbuds with 24hr battery and noise cancellation',
    price: 1299,
    countInStock: 50,
    image: 'https://images.meesho.com/images/products/earbuds.jpg',
  },
  {
    name: 'Leather Wallet',
    description: 'Slim genuine leather bi-fold wallet with card slots',
    price: 449,
    countInStock: 100,
    image: 'https://images.meesho.com/images/products/wallet.jpg',
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Double-walled 1 litre insulated water bottle',
    price: 349,
    countInStock: 200,
    image: 'https://images.meesho.com/images/products/bottle.jpg',
  },
  {
    name: 'Yoga Mat',
    description: 'Anti-slip 6mm thick yoga mat with carry strap',
    price: 599,
    countInStock: 40,
    image: 'https://images.meesho.com/images/products/yoga-mat.jpg',
  },
  {
    name: 'Backpack',
    description: 'Water-resistant 30L laptop backpack with USB charging port',
    price: 1199,
    countInStock: 55,
    image: 'https://images.meesho.com/images/products/backpack.jpg',
  },
];

const seed = async () => {
  await connectDB();

 
  const existing = await Product.find({}).sort({ createdAt: -1 });
  const seen = new Set();
  const toDelete = [];
  for (const p of existing) {
    const key = p.name.toLowerCase().trim();
    if (seen.has(key)) toDelete.push(p._id);
    else seen.add(key);
  }
  if (toDelete.length) {
    await Product.deleteMany({ _id: { $in: toDelete } });
    console.log(` Removed ${toDelete.length} duplicate product(s)`);
  }

 
  const existingNames = new Set(
    (await Product.find({}, 'name')).map((p) => p.name.toLowerCase().trim())
  );

  const toInsert = products.filter(
    (p) => !existingNames.has(p.name.toLowerCase().trim())
  );

  if (toInsert.length) {
    await Product.insertMany(toInsert);
    console.log(`Seeded ${toInsert.length} product(s)`);
  } else {
    console.log('   All products already exist, nothing to seed');
  }

  
  const adminExists = await User.findOne({ email: 'admin@example.com' });
  if (!adminExists) {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({ name: 'Admin User', email: 'admin@example.com', password: hashed, isAdmin: true });
    console.log(' Admin user created (admin@example.com / admin123)');
  } else if (!adminExists.isAdmin) {
    await User.updateOne({ email: 'admin@example.com' }, { isAdmin: true });
    console.log(' Existing admin user promoted to isAdmin=true');
  } else {
    console.log(' Admin user already exists');
  }

  console.log('\n Seeding complete!\n');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('  Seeder error:', err.message);
  process.exit(1);
});  