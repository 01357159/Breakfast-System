
import { supabase } from '../lib/supabase';

// 從 Supabase 讀取菜單
export async function getRemoteMenu() {
  if (!supabase) {
    throw new Error('Supabase 尚未設定');
  }

  const { data, error } = await supabase.rpc('get_menu');

  if (error) {
    throw new Error(`讀取菜單失敗：${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

// 將整份菜單儲存到 Supabase
export async function saveRemoteMenu(items) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定');
  }

  const { error } = await supabase.rpc('save_menu', {
    p_items: items,
  });

  if (error) {
    throw new Error(`儲存菜單失敗：${error.message}`);
  }
}

// 將 Base64 圖片上傳到 Supabase Storage
export async function uploadMenuImage(base64Image, itemId) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定');
  }

  if (!base64Image?.startsWith('data:image/')) {
    throw new Error('圖片資料格式不正確');
  }

  // 將 Base64 轉成 Blob
  const response = await fetch(base64Image);
  const blob = await response.blob();

  // 每次上傳都使用不同檔名，避免覆蓋舊圖片
  const filePath = `${itemId}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`圖片上傳失敗：${error.message}`);
  }

  // 取得公開圖片網址
  const { data } = supabase.storage
    .from('menu-images')
    .getPublicUrl(filePath);

  return {
    image: data.publicUrl,
    imagePath: filePath,
  };
}

// 刪除 Storage 中的圖片
export async function deleteMenuImage(filePath) {
  if (!supabase || !filePath) return;

  const { error } = await supabase.storage
    .from('menu-images')
    .remove([filePath]);

  if (error) {
    throw new Error(`刪除舊圖片失敗：${error.message}`);
  }
}
