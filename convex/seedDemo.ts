import { internalMutation } from "./_generated/server";

// One-off demo catalogue. Run with:
//   npx convex run seedDemo:run --prod
// It is idempotent: if any product already exists it does nothing, so it is
// safe to call twice. Nothing runs automatically on startup.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").first();
    if (existing) {
      return { skipped: true, reason: "Store already has products" };
    }

    const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=85`;

    const products = [
      {
        number: 1,
        name: "Cloud Ceramic Mug",
        category: "Ceramics",
        price: 420,
        stock: 8,
        description: "Hand-shaped ceramic mug with a soft ivory glaze. Every piece is slightly different.",
        img: img("photo-1610701596007-11502861dcfa"),
        tag: "Bestseller",
        color: "Ivory",
      },
      {
        number: 2,
        name: "Sunday Flower Candle",
        category: "Home",
        price: 285,
        stock: 13,
        description: "A small hand-poured candle, made for slow mornings and quiet evenings.",
        img: img("photo-1603006905003-be475563bc59"),
        tag: "New",
        color: "Vanilla",
      },
      {
        number: 3,
        name: "Daisy Beaded Necklace",
        category: "Accessories",
        price: 315,
        stock: 6,
        description: "Tiny beaded daisies, made one by one and finished with a delicate clasp.",
        img: img("photo-1535632066927-ab7c9ab60908"),
        tag: "",
        color: "Daisy",
      },
      {
        number: 4,
        name: "Little Loop Market Tote",
        category: "Textiles",
        price: 520,
        stock: 4,
        description: "An everyday carryall with a handmade feel and plenty of room.",
        img: img("photo-1544816155-12df9643f363"),
        tag: "Limited",
        color: "Sand",
      },
      {
        number: 5,
        name: "Petal Clay Trinket Dish",
        category: "Ceramics",
        price: 240,
        stock: 9,
        description: "A sweet catch-all for your rings, keys, and everyday treasures.",
        img: img("photo-1493106641515-6b5631de4bb9"),
        tag: "",
        color: "Blush",
      },
      {
        number: 6,
        name: "Cozy Knit Scrunchie",
        category: "Textiles",
        price: 150,
        stock: 18,
        description: "Soft, gentle and made to wear every day.",
        img: img("photo-1529139574466-a303027c1d8b"),
        tag: "",
        color: "Rose",
      },
      {
        number: 7,
        name: "Golden Hour Ring",
        category: "Accessories",
        price: 360,
        stock: 3,
        description: "A delicate everyday accent with a handmade finish.",
        img: img("photo-1515562141207-7a88fb7ce338"),
        tag: "Low stock",
        color: "Gold",
      },
      {
        number: 8,
        name: "Quiet Morning Notebook",
        category: "Home",
        price: 220,
        stock: 12,
        description: "A simple little book for all the thoughts worth keeping.",
        img: img("photo-1494438639946-1ebd1d20bf85"),
        tag: "",
        color: "Oat",
      },
    ];
    for (const product of products) await ctx.db.insert("products", product);
    const byNumber = new Map(products.map((p) => [p.number, p]));

    const collections = [
      { name: "Little everyday things", image: products[0].img, productNumbers: [1, 3, 6, 8] },
      { name: "Soft & cozy", image: products[5].img, productNumbers: [2, 4, 6] },
      { name: "For your space", image: products[1].img, productNumbers: [2, 5, 8] },
      { name: "Gift ideas", image: products[4].img, productNumbers: [1, 3, 4, 5, 7, 8] },
    ];
    for (const c of collections) await ctx.db.insert("collections", { ...c, count: c.productNumbers.length });

    for (const coupon of [
      { code: "HELLO10", type: "Percentage", value: 10, uses: 18, active: true },
      { code: "GIFT50", type: "Fixed amount", value: 50, uses: 7, active: true },
      { code: "WEEKEND15", type: "Percentage", value: 15, uses: 23, active: false },
      { code: "FREESHIP", type: "Fixed amount", value: 65, uses: 41, active: true },
    ]) {
      await ctx.db.insert("coupons", coupon);
    }

    for (const offer of [
      { name: "Free delivery over EGP 1000", kind: "Shipping", details: "Orders over EGP 1000", active: true },
      { name: "Little thank-you — 10% off", kind: "Percentage", details: "All products", active: true },
      { name: "Weekend special", kind: "Campaign", details: "Seasonal collection", active: false },
    ]) {
      await ctx.db.insert("offers", offer);
    }

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const sale of [
      { name: "Weekend studio sale", percentOff: 15, startsAt: now - 2 * day, endsAt: now + 2 * day, active: true },
      { name: "Holiday market weekend", percentOff: 20, startsAt: now + 21 * day, endsAt: now + 28 * day, active: true },
    ]) {
      await ctx.db.insert("sales", sale);
    }

    type SeedLine = { number: number; qty: number };
    const orders: {
      customer: string; phone: string; city: string; address: string;
      items: SeedLine[]; status: string; payment: string; delivery: string;
      daysAgo: number; notes?: string;
    }[] = [
      { customer: "Nour Ahmed", phone: "01023845921", city: "New Cairo", address: "Building 11, Apartment 3, Fifth Settlement", items: [{ number: 1, qty: 1 }, { number: 3, qty: 1 }], status: "New", payment: "Unpaid", delivery: "Unfulfilled", daysAgo: 0.3 },
      { customer: "Hana Khaled", phone: "01222018276", city: "6th of October", address: "6th of October City, Phase 2", items: [{ number: 5, qty: 2 }, { number: 1, qty: 1 }], status: "New", payment: "Unpaid", delivery: "Unfulfilled", daysAgo: 0.5, notes: "Please gift wrap if possible." },
      { customer: "Mariam Hassan", phone: "01124598033", city: "Maadi", address: "Street 9, Maadi, Cairo", items: [{ number: 2, qty: 2 }], status: "Confirmed", payment: "Unpaid", delivery: "Unfulfilled", daysAgo: 0.8 },
      { customer: "Farah Ali", phone: "01098012345", city: "Nasr City", address: "Abbas El Akkad, Nasr City", items: [{ number: 4, qty: 1 }], status: "Making", payment: "Unpaid", delivery: "Unfulfilled", daysAgo: 1.1 },
      { customer: "Yasmin Adel", phone: "01277123350", city: "Heliopolis", address: "Korba, Heliopolis", items: [{ number: 5, qty: 2 }], status: "Packed", payment: "Unpaid", delivery: "Packed", daysAgo: 1.4 },
      { customer: "Mariam Hassan", phone: "01124598033", city: "Maadi", address: "Street 9, Maadi, Cairo", items: [{ number: 1, qty: 2 }, { number: 4, qty: 1 }, { number: 7, qty: 1 }], status: "Delivered", payment: "Settled", delivery: "Delivered", daysAgo: 2.2 },
      { customer: "Salma Ibrahim", phone: "01033561129", city: "Giza", address: "Dokki, Giza", items: [{ number: 6, qty: 2 }, { number: 8, qty: 1 }], status: "Shipped", payment: "Collected", delivery: "With courier", daysAgo: 2.7 },
      { customer: "Laila Mohamed", phone: "01138827271", city: "Zamalek", address: "26th of July Street, Zamalek", items: [{ number: 7, qty: 1 }], status: "Delivered", payment: "Collected", delivery: "Delivered", daysAgo: 3.3 },
      { customer: "Hana Khaled", phone: "01222018276", city: "6th of October", address: "6th of October City, Phase 2", items: [{ number: 1, qty: 1 }, { number: 8, qty: 1 }], status: "Delivered", payment: "Settled", delivery: "Delivered", daysAgo: 3.6 },
      { customer: "Dina Tarek", phone: "01099213324", city: "Maadi", address: "Maadi, Cairo", items: [{ number: 3, qty: 1 }], status: "Cancelled", payment: "Unpaid", delivery: "Cancelled", daysAgo: 4.1 },
      { customer: "Omar Suliman", phone: "01001234567", city: "Cairo", address: "Heliopolis, Cairo", items: [{ number: 1, qty: 2 }, { number: 2, qty: 1 }], status: "Delivered", payment: "Settled", delivery: "Delivered", daysAgo: 4.6 },
      { customer: "Malak Youssef", phone: "01148726553", city: "Sheikh Zayed", address: "Beverly Hills, Sheikh Zayed", items: [{ number: 4, qty: 1 }, { number: 6, qty: 1 }], status: "Delivered", payment: "Settled", delivery: "Delivered", daysAgo: 5.2 },
      { customer: "Rana Mostafa", phone: "01283469711", city: "Mohandessin", address: "Gamaet El Dowal, Mohandessin", items: [{ number: 7, qty: 1 }, { number: 5, qty: 1 }], status: "Shipped", payment: "Collected", delivery: "With courier", daysAgo: 5.8 },
      { customer: "Aya Sherif", phone: "01067451289", city: "Rehab", address: "Rehab City, Gate 9", items: [{ number: 2, qty: 1 }], status: "Making", payment: "Unpaid", delivery: "Unfulfilled", daysAgo: 6.3 },
      { customer: "Nada Fouad", phone: "01195632874", city: "New Cairo", address: "Mivida, New Cairo", items: [{ number: 8, qty: 2 }, { number: 3, qty: 1 }], status: "Confirmed", payment: "Unpaid", delivery: "Unfulfilled", daysAgo: 6.9 },
      { customer: "Omar Suliman", phone: "01001234567", city: "Cairo", address: "Heliopolis, Cairo", items: [{ number: 5, qty: 1 }], status: "Delivered", payment: "Settled", delivery: "Delivered", daysAgo: 7.7 },
      { customer: "Jana Ehab", phone: "01235871496", city: "Heliopolis", address: "Roxy, Heliopolis", items: [{ number: 6, qty: 1 }, { number: 8, qty: 1 }], status: "Delivered", payment: "Collected", delivery: "Delivered", daysAgo: 8.4 },
      { customer: "Kareem Adel", phone: "01058963247", city: "Maadi", address: "Degla, Maadi", items: [{ number: 1, qty: 1 }, { number: 7, qty: 1 }], status: "Delivered", payment: "Settled", delivery: "Delivered", daysAgo: 9.2 },
    ];

    const FREE_OVER = 1000;
    let number = 1021;
    for (const order of orders) {
      const lines = order.items.map((line) => {
        const product = byNumber.get(line.number);
        if (!product) throw new Error(`Unknown product ${line.number}`);
        return { number: line.number, qty: line.qty, name: product.name, price: product.price };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
      const shippingFee = subtotal >= FREE_OVER ? 0 : 65;
      const placedAt = Math.round(now - order.daysAgo * day);
      await ctx.db.insert("orders", {
        number: number++,
        customer: order.customer,
        phone: order.phone,
        date: new Date(placedAt).toISOString(),
        placedAt,
        items: lines,
        subtotal,
        shippingFee,
        discount: 0,
        total: subtotal + shippingFee,
        status: order.status,
        payment: order.payment,
        delivery: order.delivery,
        city: order.city,
        address: order.address,
        notes: order.notes,
      });
    }

    const settings = await ctx.db.query("settings").first();
    if (settings && !settings.navigation?.length) {
      await ctx.db.patch(settings._id, { navigation: ["Ceramics", "Home", "Accessories", "Textiles"] });
    }

    return {
      skipped: false,
      products: products.length,
      collections: collections.length,
      orders: orders.length,
      coupons: 4,
      offers: 3,
      sales: 2,
    };
  },
});

// Sets the storefront nav categories when the store has none. Admins can
// change these later in Settings → Navigation.
export const navigation = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();
    if (!settings) throw new Error("No settings document");
    const categories = ["Ceramics", "Home", "Accessories", "Textiles"];
    if (settings.navigation?.length) return { navigation: settings.navigation, skipped: true };
    await ctx.db.patch(settings._id, { navigation: categories });
    return { navigation: categories, skipped: false };
  },
});

// Demo social links for the footer. Safe to run once; admins can change them.
export const socials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();
    if (!settings) throw new Error("No settings document");
    const links = [
      { network: "instagram", url: "https://www.instagram.com/bridetouch", enabled: true },
      { network: "facebook", url: "https://www.facebook.com/bridetouch", enabled: true },
      { network: "tiktok", url: "https://www.tiktok.com/@bridetouch", enabled: true },
    ];
    await ctx.db.patch(settings._id, { socials: links, instagramUrl: links[0].url });
    return { socials: links.length };
  },
});
