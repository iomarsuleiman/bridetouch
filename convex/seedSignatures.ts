export const SEED_PRODUCTS = [
  { number: 1, name: "Cloud Ceramic Mug", category: "Ceramics", price: 420, stock: 8, description: "Hand-shaped ceramic mug with a soft ivory glaze. Every piece is slightly different.", img: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=85", tag: "Bestseller", color: "Ivory" },
  { number: 2, name: "Sunday Flower Candle", category: "Home", price: 285, stock: 13, description: "A small hand-poured candle, made for slow mornings and quiet evenings.", img: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900&q=85", tag: "New", color: "Vanilla" },
  { number: 3, name: "Daisy Beaded Necklace", category: "Accessories", price: 315, stock: 6, description: "Tiny beaded daisies, made one by one and finished with a delicate clasp.", img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=85", tag: "", color: "Daisy" },
  { number: 4, name: "Little Loop Market Tote", category: "Textiles", price: 520, stock: 4, description: "An everyday carryall with a handmade feel and plenty of room.", img: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=900&q=85", tag: "Limited", color: "Sand" },
  { number: 5, name: "Petal Clay Trinket Dish", category: "Ceramics", price: 240, stock: 9, description: "A sweet catch-all for your rings, keys, and everyday treasures.", img: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=900&q=85", tag: "", color: "Blush" },
  { number: 6, name: "Cozy Knit Scrunchie", category: "Textiles", price: 150, stock: 18, description: "Soft, gentle and made to wear every day.", img: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=85", tag: "", color: "Rose" },
  { number: 7, name: "Golden Hour Ring", category: "Accessories", price: 360, stock: 3, description: "A delicate everyday accent with a handmade finish.", img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&q=85", tag: "Low stock", color: "Gold" },
  { number: 8, name: "Quiet Morning Notebook", category: "Home", price: 220, stock: 12, description: "A simple little book for all the thoughts worth keeping.", img: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=900&q=85", tag: "", color: "Oat" },
];

export const SEED_ORDERS = [
  { number: 1028, customer: "Nour Ahmed", phone: "01023845921", date: "Today, 10:42 AM", items: [{ number: 1, qty: 1 }, { number: 3, qty: 1 }], total: 795, status: "New", payment: "Unpaid", delivery: "Unfulfilled", city: "New Cairo", address: "Building 11, Apartment 3, Fifth Settlement" },
  { number: 1027, customer: "Mariam Hassan", phone: "01124598033", date: "Today, 09:16 AM", items: [{ number: 2, qty: 2 }], total: 620, status: "Confirmed", payment: "Unpaid", delivery: "Unfulfilled", city: "Maadi", address: "Street 9, Maadi, Cairo" },
  { number: 1026, customer: "Farah Ali", phone: "01098012345", date: "Yesterday", items: [{ number: 4, qty: 1 }], total: 570, status: "Making", payment: "Unpaid", delivery: "Unfulfilled", city: "Nasr City", address: "Abbas El Akkad, Nasr City" },
  { number: 1025, customer: "Yasmin Adel", phone: "01277123350", date: "Yesterday", items: [{ number: 5, qty: 2 }], total: 530, status: "Packed", payment: "Unpaid", delivery: "Packed", city: "Heliopolis", address: "Korba, Heliopolis" },
  { number: 1024, customer: "Salma Ibrahim", phone: "01033561129", date: "Nov 13, 2026", items: [{ number: 6, qty: 2 }, { number: 8, qty: 1 }], total: 570, status: "Shipped", payment: "Unpaid", delivery: "With courier", city: "Giza", address: "Dokki, Giza" },
  { number: 1023, customer: "Laila Mohamed", phone: "01138827271", date: "Nov 12, 2026", items: [{ number: 7, qty: 1 }], total: 410, status: "Delivered", payment: "Collected", delivery: "Delivered", city: "Zamalek", address: "26th of July Street, Zamalek" },
  { number: 1022, customer: "Hana Khaled", phone: "01222018276", date: "Nov 12, 2026", items: [{ number: 1, qty: 1 }, { number: 8, qty: 1 }], total: 690, status: "Delivered", payment: "Settled", delivery: "Delivered", city: "October", address: "6th of October City" },
  { number: 1021, customer: "Dina Tarek", phone: "01099213324", date: "Nov 11, 2026", items: [{ number: 3, qty: 1 }], total: 365, status: "Cancelled", payment: "Unpaid", delivery: "Cancelled", city: "Maadi", address: "Maadi, Cairo" },
];

export const SEED_COUPONS = [
  { code: "HELLO10", type: "Percentage", value: 10, uses: 18, active: true },
  { code: "GIFT50", type: "Fixed amount", value: 50, uses: 7, active: true },
  { code: "WEEKEND15", type: "Percentage", value: 15, uses: 23, active: false },
];

export const SEED_OFFERS = [
  { name: "Free delivery over EGP 800", kind: "Shipping", details: "Orders over EGP 800", active: true },
  { name: "Little thank-you — 10% off", kind: "Percentage", details: "All products", active: true },
  { name: "Weekend special", kind: "Campaign", details: "Seasonal collection", active: false },
];

export const SEED_COLLECTIONS = [
  { name: "Little everyday things", count: 4, image: SEED_PRODUCTS[0].img! },
  { name: "Soft & cozy", count: 3, image: SEED_PRODUCTS[5].img! },
  { name: "For your space", count: 3, image: SEED_PRODUCTS[1].img! },
  { name: "Gift ideas", count: 6, image: SEED_PRODUCTS[4].img! },
];

export const SEED_SETTINGS = {
  storeName: "melo studio",
  email: "hello@melostudio.example",
  city: "Cairo, Egypt",
  shipping: 65,
  freeShipping: true,
  notifications: true,
  guestCheckout: true,
};
