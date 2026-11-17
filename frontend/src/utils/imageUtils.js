
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    // 檢查圖片格式
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('只支援 JPG、PNG、WebP 格式'));
      return;
    }

    // 限制原始圖片大小為 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('圖片不能超過 5MB'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 600;

        let width = image.width;
        let height = image.height;

        // 等比例縮小圖片
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(
            maxSize / width,
            maxSize / height
          );

          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('無法處理圖片'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        // 轉成壓縮後的 JPEG Base64
        const compressedImage = canvas.toDataURL(
          'image/jpeg',
          0.7
        );

        resolve(compressedImage);
      };

      image.onerror = () => {
        reject(new Error('圖片讀取失敗'));
      };

      image.src = reader.result;
    };

    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };

    reader.readAsDataURL(file);
  });
}
