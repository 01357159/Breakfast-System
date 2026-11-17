
import { useState } from 'react';
import { compressImage } from '../../utils/imageUtils';
import './css/MenuModal.css';

export default function MenuModal({
  form,
  categories,
  menuMessage,
  updateForm,
  handleSaveMenu,
  resetForm,
}) {
  const [imageError, setImageError] = useState('');

  // 選擇新圖片並壓縮
  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageError('');

    try {
      const compressedImage = await compressImage(file);

      // 將新圖片放入編輯表單
      updateForm('image', compressedImage);
    } catch (error) {
      setImageError(error.message);
    }

    // 清空 input，讓使用者可以再次選擇同一張圖片
    event.target.value = '';
  }

  // 移除目前圖片
  function handleRemoveImage() {
    updateForm('image', '');
    setImageError('');
  }

  return (
    <div className="menu-modal-backdrop">
      <section
        className="menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-modal-title"
      >
        <div className="menu-modal-header">
          <h2 id="menu-modal-title">編輯餐點</h2>

          <button
            type="button"
            className="menu-modal-close"
            onClick={resetForm}
            aria-label="關閉編輯視窗"
          >
            ×
          </button>
        </div>

        <form
          className="menu-modal-form"
          onSubmit={handleSaveMenu}
        >
          <label>
            餐點名稱
            <input
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              required
            />
          </label>

          <label>
            餐點分類
            <select
              value={form.category}
              onChange={(e) => updateForm('category', e.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            價格（元）
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => updateForm('price', e.target.value)}
              required
            />
          </label>

          <label>
            餐點描述
            <input
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
            />
          </label>

          <div className="menu-modal-image-field">
            <span className="menu-modal-image-label">
              餐點圖片
            </span>

            <input
              id="menu-modal-image-upload"
              className="menu-modal-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />

            <label
              htmlFor="menu-modal-image-upload"
              className="menu-modal-image-upload-button"
            >
              選擇新圖片
            </label>

            {imageError && (
              <p className="menu-modal-image-error" role="alert">
                {imageError}
              </p>
            )}

            {form.image && (
              <div className="menu-modal-image-preview">
                <img src={form.image} alt="餐點圖片預覽" />

                <button
                  type="button"
                  onClick={handleRemoveImage}
                >
                  移除圖片
                </button>
              </div>
            )}
          </div>

          {menuMessage && (
            <p className="menu-message" role="alert">
              {menuMessage}
            </p>
          )}

          <div className="menu-modal-actions">
            <button type="button" onClick={resetForm}>
              取消
            </button>

            <button type="submit">
              儲存修改
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
