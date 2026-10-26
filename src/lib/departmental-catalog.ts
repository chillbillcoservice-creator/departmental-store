import { InventoryItem } from './types';

export const DEPARTMENTAL_STORE_CATALOG: InventoryItem[] = [
  // 1. Groceries & Staples
  {
    id: "8901030000001",
    name: "Aashirvaad Shudh Chakki Atta 5kg",
    category: "Groceries & Staples",
    stock: 45,
    capacity: 100,
    unit: "bag",
    price: 245,
    costPrice: 215,
    discount: 5,
    hsnCode: "1101",
    taxRate: 5,
    location: "Aisle 1 - Flour & Grains"
  },
  {
    id: "8901030000002",
    name: "Fortune Sunlite Refined Sunflower Oil 1L",
    category: "Groceries & Staples",
    stock: 60,
    capacity: 120,
    unit: "ltr",
    price: 145,
    costPrice: 128,
    discount: 0,
    hsnCode: "1512",
    taxRate: 5,
    location: "Aisle 1 - Cooking Oils"
  },
  {
    id: "8901030000003",
    name: "India Gate Basmati Rice Feast 1kg",
    category: "Groceries & Staples",
    stock: 35,
    capacity: 80,
    unit: "kg",
    price: 135,
    costPrice: 115,
    discount: 10,
    hsnCode: "1006",
    taxRate: 5,
    location: "Aisle 1 - Rice & Pulses"
  },
  {
    id: "8901030000004",
    name: "Tata Salt Vacuum Evaporated 1kg",
    category: "Groceries & Staples",
    stock: 80,
    capacity: 150,
    unit: "pck",
    price: 28,
    costPrice: 22,
    discount: 0,
    hsnCode: "2501",
    taxRate: 0,
    location: "Aisle 1 - Spices & Salt"
  },
  {
    id: "8901030000005",
    name: "Madhur Pure & Hygienic Sugar 1kg",
    category: "Groceries & Staples",
    stock: 50,
    capacity: 100,
    unit: "kg",
    price: 52,
    costPrice: 44,
    discount: 0,
    hsnCode: "1701",
    taxRate: 5,
    location: "Aisle 1 - Sugar"
  },
  {
    id: "8901030000006",
    name: "Tata Sampann Unpolished Toor Dal 1kg",
    category: "Groceries & Staples",
    stock: 30,
    capacity: 60,
    unit: "kg",
    price: 165,
    costPrice: 142,
    discount: 5,
    hsnCode: "0713",
    taxRate: 0,
    location: "Aisle 1 - Pulses"
  },
  {
    id: "8901030000007",
    name: "Catch Super Garam Masala 100g",
    category: "Groceries & Staples",
    stock: 40,
    capacity: 80,
    unit: "box",
    price: 78,
    costPrice: 62,
    discount: 0,
    hsnCode: "0910",
    taxRate: 5,
    location: "Aisle 1 - Spices"
  },
  {
    id: "8901030000008",
    name: "MDH Deggi Mirch Powder 100g",
    category: "Groceries & Staples",
    stock: 45,
    capacity: 90,
    unit: "box",
    price: 86,
    costPrice: 70,
    discount: 0,
    hsnCode: "0904",
    taxRate: 5,
    location: "Aisle 1 - Spices"
  },

  // 2. Dairy & Breakfast
  {
    id: "8901030000009",
    name: "Amul Butter Pasteurized 100g",
    category: "Dairy & Breakfast",
    stock: 50,
    capacity: 100,
    unit: "pcs",
    price: 58,
    costPrice: 51,
    discount: 0,
    hsnCode: "0405",
    taxRate: 12,
    location: "Chiller 1 - Dairy"
  },
  {
    id: "8901030000010",
    name: "Amul Gold Full Cream Milk 500ml",
    category: "Dairy & Breakfast",
    stock: 40,
    capacity: 80,
    unit: "pouch",
    price: 34,
    costPrice: 31,
    discount: 0,
    hsnCode: "0401",
    taxRate: 5,
    location: "Chiller 1 - Milk"
  },
  {
    id: "8901030000011",
    name: "Amul Malai Fresh Paneer 200g",
    category: "Dairy & Breakfast",
    stock: 25,
    capacity: 50,
    unit: "pcs",
    price: 92,
    costPrice: 80,
    discount: 0,
    hsnCode: "0406",
    taxRate: 5,
    location: "Chiller 1 - Paneer"
  },
  {
    id: "8901030000012",
    name: "Britannia 100% Whole Wheat Bread 400g",
    category: "Dairy & Breakfast",
    stock: 30,
    capacity: 50,
    unit: "loaf",
    price: 55,
    costPrice: 46,
    discount: 0,
    hsnCode: "1905",
    taxRate: 0,
    location: "Aisle 2 - Bakery"
  },
  {
    id: "8901030000013",
    name: "Kellogg's Corn Flakes Original 500g",
    category: "Dairy & Breakfast",
    stock: 20,
    capacity: 40,
    unit: "box",
    price: 215,
    costPrice: 185,
    discount: 8,
    hsnCode: "1904",
    taxRate: 18,
    location: "Aisle 2 - Cereals"
  },

  // 3. Snacks & Packaged Foods
  {
    id: "8901030000014",
    name: "Maggi 2-Minute Masala Noodles 70g",
    category: "Snacks & Packaged Foods",
    stock: 120,
    capacity: 250,
    unit: "pcs",
    price: 14,
    costPrice: 11.5,
    discount: 0,
    hsnCode: "1902",
    taxRate: 18,
    location: "Aisle 3 - Instant Noodles"
  },
  {
    id: "8901030000015",
    name: "Lay's India's Magic Masala Chips 50g",
    category: "Snacks & Packaged Foods",
    stock: 60,
    capacity: 120,
    unit: "pck",
    price: 20,
    costPrice: 16.5,
    discount: 0,
    hsnCode: "1905",
    taxRate: 12,
    location: "Aisle 3 - Chips & Crisps"
  },
  {
    id: "8901030000016",
    name: "Parle-G Original Gluco Biscuits 250g",
    category: "Snacks & Packaged Foods",
    stock: 70,
    capacity: 150,
    unit: "pck",
    price: 30,
    costPrice: 25,
    discount: 0,
    hsnCode: "1905",
    taxRate: 18,
    location: "Aisle 3 - Biscuits"
  },
  {
    id: "8901030000017",
    name: "Haldiram's Nagpur Aloo Bhujia 200g",
    category: "Snacks & Packaged Foods",
    stock: 40,
    capacity: 80,
    unit: "pck",
    price: 55,
    costPrice: 45,
    discount: 5,
    hsnCode: "2106",
    taxRate: 12,
    location: "Aisle 3 - Namkeen"
  },
  {
    id: "8901030000018",
    name: "Cadbury Dairy Milk Chocolate 50g",
    category: "Snacks & Packaged Foods",
    stock: 55,
    capacity: 100,
    unit: "pcs",
    price: 45,
    costPrice: 38,
    discount: 0,
    hsnCode: "1806",
    taxRate: 18,
    location: "Counter Shelf - Confectionery"
  },

  // 4. Beverages
  {
    id: "8901030000019",
    name: "Tata Tea Gold Leaf 500g",
    category: "Beverages",
    stock: 30,
    capacity: 60,
    unit: "box",
    price: 310,
    costPrice: 275,
    discount: 5,
    hsnCode: "0902",
    taxRate: 5,
    location: "Aisle 4 - Tea & Coffee"
  },
  {
    id: "8901030000020",
    name: "Nescafe Classic Instant Coffee 50g",
    category: "Beverages",
    stock: 25,
    capacity: 50,
    unit: "jar",
    price: 185,
    costPrice: 160,
    discount: 0,
    hsnCode: "0901",
    taxRate: 18,
    location: "Aisle 4 - Tea & Coffee"
  },
  {
    id: "8901030000021",
    name: "Coca-Cola Original 750ml",
    category: "Beverages",
    stock: 50,
    capacity: 100,
    unit: "bottle",
    price: 40,
    costPrice: 34,
    discount: 0,
    hsnCode: "2202",
    taxRate: 28,
    location: "Beverage Chiller 2"
  },
  {
    id: "8901030000022",
    name: "Real Fruit Power Mixed Fruit Juice 1L",
    category: "Beverages",
    stock: 30,
    capacity: 60,
    unit: "tetra",
    price: 130,
    costPrice: 110,
    discount: 5,
    hsnCode: "2202",
    taxRate: 12,
    location: "Aisle 4 - Juices"
  },

  // 5. Personal Care & Hygiene
  {
    id: "8901030000023",
    name: "Dettol Original Bathing Soap 125g",
    category: "Personal Care & Hygiene",
    stock: 75,
    capacity: 150,
    unit: "pcs",
    price: 56,
    costPrice: 48,
    discount: 0,
    hsnCode: "3401",
    taxRate: 18,
    location: "Aisle 5 - Soaps & Body Wash"
  },
  {
    id: "8901030000024",
    name: "Colgate Total 12-Hour Protection 150g",
    category: "Personal Care & Hygiene",
    stock: 40,
    capacity: 80,
    unit: "tube",
    price: 135,
    costPrice: 115,
    discount: 10,
    hsnCode: "3306",
    taxRate: 18,
    location: "Aisle 5 - Oral Care"
  },
  {
    id: "8901030000025",
    name: "Head & Shoulders Cool Menthol Shampoo 180ml",
    category: "Personal Care & Hygiene",
    stock: 30,
    capacity: 60,
    unit: "bottle",
    price: 185,
    costPrice: 155,
    discount: 5,
    hsnCode: "3305",
    taxRate: 18,
    location: "Aisle 5 - Hair Care"
  },

  // 6. Household & Cleaning
  {
    id: "8901030000026",
    name: "Surf Excel Easy Wash Detergent 1kg",
    category: "Household & Cleaning",
    stock: 25,
    capacity: 50,
    unit: "pck",
    price: 145,
    costPrice: 125,
    discount: 5,
    hsnCode: "3402",
    taxRate: 18,
    location: "Aisle 6 - Detergents"
  },
  {
    id: "8901030000027",
    name: "Vim Lemon Dishwash Gel Bottle 500ml",
    category: "Household & Cleaning",
    stock: 35,
    capacity: 70,
    unit: "bottle",
    price: 115,
    costPrice: 95,
    discount: 0,
    hsnCode: "3402",
    taxRate: 18,
    location: "Aisle 6 - Dishwash"
  },
  {
    id: "8901030000028",
    name: "Lizol Disinfectant Floor Cleaner Citrus 500ml",
    category: "Household & Cleaning",
    stock: 30,
    capacity: 60,
    unit: "bottle",
    price: 105,
    costPrice: 88,
    discount: 0,
    hsnCode: "3808",
    taxRate: 18,
    location: "Aisle 6 - Surface Cleaners"
  }
];

export function isLegacyInventory(items: any[] | null | undefined): boolean {
  if (!items || !Array.isArray(items)) return true;
  // If user or store owner has explicitly chosen an empty catalog (fresh slate), do not re-inject
  if (typeof window !== 'undefined' && localStorage.getItem('chillbill_catalog_initialized') === 'true') {
    return false;
  }
  if (items.length === 0) return true;
  // If user only has legacy items from old placeholder list
  const legacyNames = ['paper', 'Pizza Base', 'Pasta', 'Cheese', 'Coffee Beans'];
  const hasLegacyName = items.some(i => legacyNames.includes(i.name));
  const hasUnderSixItems = items.length <= 5;
  return hasLegacyName && hasUnderSixItems;
}
