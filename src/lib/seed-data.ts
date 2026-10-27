'use client';

const defaultMenuRaw = [
    {
      "category": "Groceries & Staples",
      "items": [
        { "name": "Aashirvaad Shudh Chakki Atta 5kg", "price": 245 },
        { "name": "Fortune Sunlite Refined Sunflower Oil 1L", "price": 145 },
        { "name": "India Gate Basmati Rice 1kg", "price": 135 },
        { "name": "Tata Salt Vacuum Evaporated 1kg", "price": 28 },
        { "name": "Madhur Pure & Hygienic Sugar 1kg", "price": 52 },
        { "name": "Tata Sampann Toor Dal 1kg", "price": 165 },
        { "name": "Tata Sampann Moong Dal 500g", "price": 85 },
        { "name": "Tata Sampann Chana Dal 1kg", "price": 110 },
        { "name": "Fortune Premium Kachi Ghani Mustard Oil 1L", "price": 155 },
        { "name": "Catch Super Garam Masala 100g", "price": 78 },
        { "name": "MDH Deggi Mirch 100g", "price": 86 },
        { "name": "Catch Turmeric Powder 200g", "price": 62 }
      ]
    },
    {
      "category": "Dairy & Breakfast",
      "items": [
        { "name": "Amul Butter Pasteurized 100g", "price": 58 },
        { "name": "Amul Butter Pasteurized 500g", "price": 275 },
        { "name": "Amul Taaza Homogenised Toned Milk 500ml", "price": 29 },
        { "name": "Amul Gold Full Cream Fresh Milk 500ml", "price": 34 },
        { "name": "Amul Masti Dahi Pouch 400g", "price": 35 },
        { "name": "Amul Malai Fresh Paneer 200g", "price": 92 },
        { "name": "Amul Cheese Slices 200g", "price": 140 },
        { "name": "Britannia Daily Fresh White Bread 400g", "price": 45 },
        { "name": "Britannia 100% Whole Wheat Bread 400g", "price": 55 },
        { "name": "Kellogg's Corn Flakes Original 500g", "price": 215 },
        { "name": "Quaker Rolled Oats 1kg", "price": 190 }
      ]
    },
    {
      "category": "Snacks & Packaged Foods",
      "items": [
        { "name": "Maggi 2-Minute Masala Instant Noodles 70g", "price": 14 },
        { "name": "Maggi 2-Minute Masala Noodles (Pack of 4)", "price": 56 },
        { "name": "Lay's India's Magic Masala Chips 50g", "price": 20 },
        { "name": "Lay's Spanish Tomato Tango 50g", "price": 20 },
        { "name": "Kurkure Masala Munch 80g", "price": 20 },
        { "name": "Parle-G Original Gluco Biscuits 250g", "price": 30 },
        { "name": "Britannia Good Day Butter Cookies 120g", "price": 35 },
        { "name": "Oreo Vanilla Creme Biscuits 120g", "price": 40 },
        { "name": "Haldiram's Nagpur Aloo Bhujia 200g", "price": 55 },
        { "name": "Haldiram's Khatta Meetha Namkeen 200g", "price": 55 },
        { "name": "Cadbury Dairy Milk Chocolate 50g", "price": 45 },
        { "name": "Nestle KitKat 4-Finger Wafer Bar 38g", "price": 30 }
      ]
    },
    {
      "category": "Beverages",
      "items": [
        { "name": "Tata Tea Gold 500g", "price": 310 },
        { "name": "Brooke Bond Red Label Tea 250g", "price": 150 },
        { "name": "Nescafe Classic 100% Pure Instant Coffee 50g", "price": 185 },
        { "name": "Bru Instant Coffee 50g", "price": 125 },
        { "name": "Coca-Cola Original Taste 750ml", "price": 40 },
        { "name": "Sprite Refreshing Lemon Drink 750ml", "price": 40 },
        { "name": "Thums Up Charged 750ml", "price": 40 },
        { "name": "Real Fruit Power Mixed Fruit Juice 1L", "price": 130 },
        { "name": "Frooti Fresh 'N' Juicy Mango Drink 600ml", "price": 40 },
        { "name": "Bisleri Packaged Drinking Water 1L", "price": 20 },
        { "name": "Kinley Soda Water 750ml", "price": 20 }
      ]
    },
    {
      "category": "Personal Care & Hygiene",
      "items": [
        { "name": "Dettol Original Germ Protection Bathing Soap 125g", "price": 56 },
        { "name": "Lifebuoy Total Germ Protection Soap 125g", "price": 42 },
        { "name": "Dove Daily Moisture Bathing Bar 100g", "price": 68 },
        { "name": "Colgate Total Anti-Cavity Toothpaste 150g", "price": 135 },
        { "name": "Dabur Red Ayurvedic Toothpaste 150g", "price": 95 },
        { "name": "Sensodyne Rapid Relief Toothpaste 80g", "price": 190 },
        { "name": "Head & Shoulders Anti-Dandruff Shampoo 180ml", "price": 185 },
        { "name": "Dove Daily Shine Therapy Shampoo 180ml", "price": 175 },
        { "name": "Nivea Soft Light Moisturiser Cream 100ml", "price": 199 }
      ]
    },
    {
      "category": "Household & Cleaning",
      "items": [
        { "name": "Surf Excel Easy Wash Detergent Powder 1kg", "price": 145 },
        { "name": "Ariel Matic Front & Top Load Detergent 1kg", "price": 235 },
        { "name": "Vim Dishwash Bar 300g", "price": 30 },
        { "name": "Vim Lemon Dishwash Gel Bottle 500ml", "price": 115 },
        { "name": "Lizol Disinfectant Surface Floor Cleaner 500ml", "price": 105 },
        { "name": "Harpic Power Plus Disinfectant Toilet Cleaner 500ml", "price": 99 },
        { "name": "Colin Glass and Household Cleaner Spray 500ml", "price": 105 },
        { "name": "Good knight Gold Flash Mosquito Liquid Refill 45ml", "price": 85 }
      ]
    }
];

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export const seedData = () => {
    let codeCounter = 1;
    const defaultMenu = defaultMenuRaw.map(category => ({
        id: slugify(category.category),
        name: category.category,
        items: category.items.map(item => ({
            ...item,
            history: [], 
            ingredients: [],
            code: String(codeCounter++).padStart(2, '0')
        }))
    }));
    return defaultMenu;
};
