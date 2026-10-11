// src/data/menuData.js

const DEFAULT_MENU = [
  // ================= 1. 酥脆蛋餅 =================
  { id: 101, category: 'omelet', name: '原味蛋餅', price: 25, description: '經典酥脆蛋餅皮', image: 'https://via.placeholder.com/150', available: true },
  { id: 102, category: 'omelet', name: '起司蛋餅', price: 35, description: '香濃起司內餡', image: 'https://via.placeholder.com/150', available: true },
  { id: 103, category: 'omelet', name: '火腿蛋餅', price: 35, description: '經典火腿片', image: 'https://via.placeholder.com/150', available: true },
  { id: 104, category: 'omelet', name: '培根蛋餅', price: 35, description: '香煎培根', image: 'https://via.placeholder.com/150', available: true },
  { id: 105, category: 'omelet', name: '玉米蛋餅', price: 40, description: '鮮甜玉米粒', image: 'https://via.placeholder.com/150', available: true },
  { id: 106, category: 'omelet', name: '薯餅蛋餅', price: 45, description: '酥餅薯餅包入蛋餅中', image: 'https://via.placeholder.com/150', available: true },
  { id: 107, category: 'omelet', name: '蔬菜蛋餅', price: 40, description: '清爽新鮮蔬菜', image: 'https://via.placeholder.com/150', available: true },
  { id: 108, category: 'omelet', name: '鮪魚蛋餅', price: 45, description: '鮮美鮪魚沙拉', image: 'https://via.placeholder.com/150', available: true },
  { id: 109, category: 'omelet', name: '豬排蛋餅', price: 50, description: '厚實入味豬排', image: 'https://via.placeholder.com/150', available: true },
  { id: 110, category: 'omelet', name: '乳酪蛋餅', price: 45, description: '濃郁乳酪香氣', image: 'https://via.placeholder.com/150', available: true },
  { id: 111, category: 'omelet', name: '燻雞蛋餅', price: 50, description: '煙燻雞肉風味', image: 'https://via.placeholder.com/150', available: true },

  // ================= 2. 烤土司 =================
  { id: 201, category: 'toast', name: '薄片土司 (奶油/草莓/花生/椰香/巧克力/香蒜)', price: 20, description: '烤至金黃酥脆的美味薄片', image: 'https://via.placeholder.com/150', available: true },
  { id: 202, category: 'toast', name: '厚片土司 (奶油/草莓/花生/椰香/巧克力/香蒜)', price: 25, description: '厚實鬆軟口感', image: 'https://via.placeholder.com/150', available: true },
  { id: 203, category: 'toast', name: '丹麥土司 (奶油/草莓/花生/椰香/巧克力/香蒜)', price: 30, description: '層次豐富的丹麥酥皮', image: 'https://via.placeholder.com/150', available: true },
  { id: 204, category: 'toast', name: '起司磚', price: 35, description: '濃郁起司烤土司', image: 'https://via.placeholder.com/150', available: true },

  // ================= 3. 漢堡 / 吐司 =================
  { id: 301, category: 'burger', name: '火腿漢堡', price: 30, description: '經典早餐好滋味', image: 'https://via.placeholder.com/150', available: true },
  { id: 302, category: 'burger', name: '培根漢堡', price: 30, description: '香煎培根', image: 'https://via.placeholder.com/150', available: true },
  { id: 303, category: 'burger', name: '肉鬆漢堡', price: 30, description: '古早味香酥肉鬆', image: 'https://via.placeholder.com/150', available: true },
  { id: 304, category: 'burger', name: '起司漢堡', price: 30, description: '香濃起司片', image: 'https://via.placeholder.com/150', available: true },
  { id: 305, category: 'burger', name: '法式(甜)土司', price: 35, description: '抹醬：奶油/草莓/花生/椰香/巧克力', image: 'https://via.placeholder.com/150', available: true },
  { id: 306, category: 'burger', name: '法式(鹹)土司', price: 40, description: '火腿或培根', image: 'https://via.placeholder.com/150', available: true },
  { id: 307, category: 'burger', name: '豬肉漢堡', price: 35, description: '經典多汁豬肉排', image: 'https://via.placeholder.com/150', available: true },
  { id: 308, category: 'burger', name: '大亨堡 (不含蛋)', price: 40, description: '美式熱狗大亨堡', image: 'https://via.placeholder.com/150', available: true },
  { id: 309, category: 'burger', name: '照燒漢堡', price: 35, description: '特製日式照燒醬汁', image: 'https://via.placeholder.com/150', available: true },
  { id: 310, category: 'burger', name: '玉米蛋漢堡', price: 40, description: '鮮甜玉米煎蛋', image: 'https://via.placeholder.com/150', available: true },
  { id: 311, category: 'burger', name: '里肌漢堡', price: 45, description: '鮮嫩里肌肉排', image: 'https://via.placeholder.com/150', available: true },
  { id: 312, category: 'burger', name: '雞香漢堡', price: 40, description: '香嫩雞肉排', image: 'https://via.placeholder.com/150', available: true },
  { id: 313, category: 'burger', name: '檸檬雞柳漢堡', price: 40, description: '清爽檸檬風味雞柳', image: 'https://via.placeholder.com/150', available: true },
  { id: 314, category: 'burger', name: '薯餅漢堡', price: 45, description: '外酥內軟薯餅夾堡', image: 'https://via.placeholder.com/150', available: true },
  { id: 315, category: 'burger', name: '牛肉漢堡', price: 40, description: '經典多汁牛肉排', image: 'https://via.placeholder.com/150', available: true },
  { id: 316, category: 'burger', name: '鮪魚漢堡', price: 40, description: '鮮美鮪魚', image: 'https://via.placeholder.com/150', available: true },
  { id: 317, category: 'burger', name: '蝦香漢堡', price: 40, description: '海味十足蝦排', image: 'https://via.placeholder.com/150', available: true },
  { id: 318, category: 'burger', name: '燻雞蛋漢堡', price: 50, description: '煙燻雞肉與雞蛋', image: 'https://via.placeholder.com/150', available: true },
  { id: 319, category: 'burger', name: '起司豬排漢堡', price: 50, description: '香濃起司豬排', image: 'https://via.placeholder.com/150', available: true },
  { id: 320, category: 'burger', name: '酥炸鱈魚漢堡', price: 55, description: '金黃酥脆鱈魚排', image: 'https://via.placeholder.com/150', available: true },
  { id: 321, category: 'burger', name: '總匯(豬肉)蛋', price: 65, description: '澎湃多層次總匯', image: 'https://via.placeholder.com/150', available: true },
  { id: 322, category: 'burger', name: '卡啦雞腿漢堡', price: 60, description: '外皮酥脆，肉質鮮嫩', image: 'https://via.placeholder.com/150', available: true },
  { id: 323, category: 'burger', name: '總匯(里肌)蛋', price: 70, description: '里肌肉澎湃總匯', image: 'https://via.placeholder.com/150', available: true },
  { id: 324, category: 'burger', name: '辣雞腿漢堡', price: 65, description: '香辣夠勁雞腿排', image: 'https://via.placeholder.com/150', available: true },
  { id: 325, category: 'burger', name: '香烤雞腿漢堡', price: 65, description: '鮮嫩多汁香烤雞腿', image: 'https://via.placeholder.com/150', available: true },
  { id: 326, category: 'burger', name: '西西里雞腿漢堡', price: 65, description: '義式西西里風味雞腿', image: 'https://via.placeholder.com/150', available: true },
  { id: 327, category: 'burger', name: '厚牛起司漢堡', price: 65, description: '多汁厚牛與香濃起司', image: 'https://via.placeholder.com/150', available: true },

  // ================= 4. 乳酪餅 =================
  { id: 401, category: 'cheese_pie', name: '果醬乳酪餅 (奶油/草莓/花生/椰香/巧克力)', price: 25, description: '香酥乳酪餅皮搭配抹醬', image: 'https://via.placeholder.com/150', available: true },
  { id: 402, category: 'cheese_pie', name: '火腿乳酪餅', price: 35, description: '火腿與乳酪餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 403, category: 'cheese_pie', name: '培根乳酪餅', price: 35, description: '培根與乳酪餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 404, category: 'cheese_pie', name: '起司乳酪餅', price: 35, description: '雙倍起司濃郁', image: 'https://via.placeholder.com/150', available: true },
  { id: 405, category: 'cheese_pie', name: '熱狗乳酪餅', price: 45, description: '經典熱狗', image: 'https://via.placeholder.com/150', available: true },
  { id: 406, category: 'cheese_pie', name: '鮪魚乳酪餅', price: 45, description: '鮪魚內餡', image: 'https://via.placeholder.com/150', available: true },
  { id: 407, category: 'cheese_pie', name: '豬排乳酪餅', price: 50, description: '厚實豬排乳酪餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 408, category: 'cheese_pie', name: '燻雞蛋乳酪餅', price: 50, description: '燻雞與雞蛋', image: 'https://via.placeholder.com/150', available: true },
  { id: 409, category: 'cheese_pie', name: '雞排乳酪餅', price: 50, description: '金黃雞排', image: 'https://via.placeholder.com/150', available: true },

  // ================= 5. 招牌 / 美寶堡 / 丹麥吐司 =================
  { id: 501, category: 'signature', name: '鐵板麵', price: 40, description: '黑胡椒/蘑菇鐵板麵', image: 'https://via.placeholder.com/150', available: true },
  { id: 502, category: 'signature', name: '歐姆蛋 (火腿)', price: 35, description: '滑嫩歐姆蛋包火腿', image: 'https://via.placeholder.com/150', available: true },
  { id: 503, category: 'signature', name: '歐姆蛋 (培根)', price: 40, description: '滑嫩歐姆蛋包培根', image: 'https://via.placeholder.com/150', available: true },
  { id: 504, category: 'signature', name: '歐姆蛋 (燻雞)', price: 45, description: '滑嫩歐姆蛋包燻雞', image: 'https://via.placeholder.com/150', available: true },
  { id: 505, category: 'signature', name: '乳酪三明治', price: 45, description: '經典乳酪夾心三明治', image: 'https://via.placeholder.com/150', available: true },
  { id: 506, category: 'signature', name: '牛肉捲餅', price: 50, description: '扎實牛肉捲餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 507, category: 'signature', name: '美寶堡 (原味豬肉)', price: 35, description: '美式特色堡包豬肉', image: 'https://via.placeholder.com/150', available: true },
  { id: 508, category: 'signature', name: '美寶堡 (火腿起司)', price: 40, description: '火腿與起司美寶堡', image: 'https://via.placeholder.com/150', available: true },
  { id: 509, category: 'signature', name: '美寶堡 (豬排)', price: 45, description: '豬排美寶堡', image: 'https://via.placeholder.com/150', available: true },
  { id: 510, category: 'signature', name: '丹麥吐司 (火腿起司)', price: 40, description: '酥脆丹麥包火腿起司', image: 'https://via.placeholder.com/150', available: true },
  { id: 511, category: 'signature', name: '丹麥吐司 (培根起司)', price: 40, description: '香脆培根起司丹麥', image: 'https://via.placeholder.com/150', available: true },
  { id: 512, category: 'signature', name: '丹麥吐司 (里肌)', price: 45, description: '里肌肉丹麥吐司', image: 'https://via.placeholder.com/150', available: true },
  { id: 513, category: 'signature', name: '丹麥吐司 (鮪魚)', price: 45, description: '鮮美鮪魚丹麥', image: 'https://via.placeholder.com/150', available: true },
  { id: 514, category: 'signature', name: '炒泡麵 (大碗)', price: 60, description: '人氣必點大碗香濃炒泡麵', image: 'https://via.placeholder.com/150', available: true },
  { id: 515, category: 'signature', name: '炒泡麵 (小碗)', price: 40, description: '人氣必點小碗香濃炒泡麵', image: 'https://via.placeholder.com/150', available: true },

  // ================= 6. 中式小點 / 炸物 =================
  { id: 601, category: 'snacks', name: '荷包蛋 (全熟)', price: 15, description: '新鮮現煎全熟蛋', image: 'https://via.placeholder.com/150', available: true },
  { id: 602, category: 'snacks', name: '荷包蛋 (半熟)', price: 15, description: '新鮮現煎爆漿半熟蛋', image: 'https://via.placeholder.com/150', available: true },
  { id: 603, category: 'snacks', name: '煎餃 (8個)', price: 30, description: '金黃酥脆煎餃', image: 'https://via.placeholder.com/150', available: true },
  { id: 604, category: 'snacks', name: '湯包 (6個)', price: 30, description: '鮮美多汁小湯包', image: 'https://via.placeholder.com/150', available: true },
  { id: 605, category: 'snacks', name: '蔥抓餅', price: 35, description: '外酥內Q蔥抓餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 606, category: 'snacks', name: '蘿蔔糕', price: 35, description: '經典港式蘿蔔糕', image: 'https://via.placeholder.com/150', available: true },
  { id: 607, category: 'snacks', name: '蔥抓餅加蛋', price: 45, description: '蔥抓餅加新鮮雞蛋', image: 'https://via.placeholder.com/150', available: true },
  { id: 608, category: 'snacks', name: '鍋貼 (7個)', price: 35, description: '香煎酥脆鍋貼', image: 'https://via.placeholder.com/150', available: true },
  { id: 609, category: 'snacks', name: '熱狗 (3條)', price: 20, description: '小朋友最愛小熱狗', image: 'https://via.placeholder.com/150', available: true },
  { id: 610, category: 'snacks', name: '薯餅 (1片)', price: 20, description: '酥脆金黃薯餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 611, category: 'snacks', name: '微笑薯餅', price: 30, description: '可愛造型微笑薯餅', image: 'https://via.placeholder.com/150', available: true },
  { id: 612, category: 'snacks', name: '大阪雞排', price: 35, description: '日式大阪風味雞排', image: 'https://via.placeholder.com/150', available: true },
  { id: 613, category: 'snacks', name: '大阪豬排', price: 35, description: '日式大阪風味豬排', image: 'https://via.placeholder.com/150', available: true },
  { id: 614, category: 'snacks', name: '日式蝦排', price: 30, description: '酥脆日式蝦排', image: 'https://via.placeholder.com/150', available: true },
  { id: 615, category: 'snacks', name: '黃金脆薯', price: 35, description: '美式金黃脆薯條', image: 'https://via.placeholder.com/150', available: true },
  { id: 616, category: 'snacks', name: '麥克雞塊', price: 35, description: '香酥多汁雞塊', image: 'https://via.placeholder.com/150', available: true },
  { id: 617, category: 'snacks', name: '檸檬雞柳', price: 35, description: '清爽檸檬風味雞柳條', image: 'https://via.placeholder.com/150', available: true },
  { id: 618, category: 'snacks', name: '卡啦單點', price: 35, description: '單點卡啦雞腿排', image: 'https://via.placeholder.com/150', available: true },

  // ================= 7. 飲料 =================
  { id: 701, category: 'drinks', name: '紅茶 (大)', price: 20, description: '古早味香甜紅茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 702, category: 'drinks', name: '紅茶 (中)', price: 15, description: '古早味香甜紅茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 703, category: 'drinks', name: '奶茶 (大)', price: 25, description: '香醇滑順奶茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 704, category: 'drinks', name: '奶茶 (中)', price: 20, description: '香醇滑順奶茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 705, category: 'drinks', name: '綠茶 (大)', price: 20, description: '清香回甘綠茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 706, category: 'drinks', name: '綠茶 (中)', price: 15, description: '清香回甘綠茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 707, category: 'drinks', name: '咖啡 (大)', price: 20, description: '香濃經典咖啡', image: 'https://via.placeholder.com/150', available: true },
  { id: 708, category: 'drinks', name: '咖啡 (中)', price: 15, description: '香濃經典咖啡', image: 'https://via.placeholder.com/150', available: true },
  { id: 709, category: 'drinks', name: '柳橙汁 (大)', price: 20, description: '酸甜柳橙風味', image: 'https://via.placeholder.com/150', available: true },
  { id: 710, category: 'drinks', name: '柳橙汁 (中)', price: 15, description: '酸甜柳橙風味', image: 'https://via.placeholder.com/150', available: true },
  { id: 711, category: 'drinks', name: '水蜜桃汁 (大)', price: 20, description: '香甜水蜜桃風味', image: 'https://via.placeholder.com/150', available: true },
  { id: 712, category: 'drinks', name: '水蜜桃汁 (中)', price: 15, description: '香甜水蜜桃風味', image: 'https://via.placeholder.com/150', available: true },
  { id: 713, category: 'drinks', name: '百香果汁 (大)', price: 20, description: '酸甜百香果風味', image: 'https://via.placeholder.com/150', available: true },
  { id: 714, category: 'drinks', name: '百香果汁 (中)', price: 15, description: '酸甜百香果風味', image: 'https://via.placeholder.com/150', available: true },
  { id: 715, category: 'drinks', name: '豆漿 (大)', price: 25, description: '香濃黃豆漿', image: 'https://via.placeholder.com/150', available: true },
  { id: 716, category: 'drinks', name: '豆漿 (中)', price: 20, description: '香濃黃豆漿', image: 'https://via.placeholder.com/150', available: true },
  { id: 717, category: 'drinks', name: '豆漿 無糖 (大)', price: 25, description: '健康無糖黃豆漿', image: 'https://via.placeholder.com/150', available: true },
  { id: 718, category: 'drinks', name: '豆漿 無糖 (中)', price: 20, description: '健康無糖黃豆漿', image: 'https://via.placeholder.com/150', available: true },
  { id: 719, category: 'drinks', name: '紅茶豆漿 (大)', price: 25, description: '經典紅茶調和豆漿', image: 'https://via.placeholder.com/150', available: true },
  { id: 720, category: 'drinks', name: '牛奶 (保久乳)', price: 25, description: '營養香醇保久乳', image: 'https://via.placeholder.com/150', available: true },
  { id: 721, category: 'drinks', name: '巧克力牛奶 (保久乳)', price: 25, description: '香濃巧克力風味保久乳', image: 'https://via.placeholder.com/150', available: true },
  { id: 722, category: 'drinks', name: '紅茶拿鐵 (大)', price: 40, description: '濃郁鮮奶加紅茶', image: 'https://via.placeholder.com/150', available: true },
  { id: 723, category: 'drinks', name: '紅茶拿鐵 (中)', price: 30, description: '濃郁鮮奶加紅茶', image: 'https://via.placeholder.com/150', available: true }
];

export const MENU_CATEGORIES = [
  { id: 'omelet', name: '酥脆蛋餅' },
  { id: 'toast', name: '烤土司' },
  { id: 'burger', name: '漢堡 / 吐司' },
  { id: 'cheese_pie', name: '乳酪餅' },
  { id: 'signature', name: '招牌 / 炒泡麵' },
  { id: 'snacks', name: '小點 / 炸物' },
  { id: 'drinks', name: '精選飲料' },
];

export function getMenu() {
  const saved = localStorage.getItem('breakfast_menu');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("解析本地菜單失敗", e);
    }
  }
  return DEFAULT_MENU;
}

export function saveMenu(newMenu) {
  localStorage.setItem('breakfast_menu', JSON.stringify(newMenu));
}