
import { useState } from 'react';
import { compressImage } from '../../utils/imageUtils';
import './css/Menu.css';

export default function Menu({
  menuItems,
  form,
  editingId,
  menuMessage,
  categories,
  updateForm,
  handleSaveMenu,
  resetForm,
  handleEditMenu,
  handleToggleMenu,
}) {
  const [imageError, setImageError] = useState('');

  // 選擇圖片並進行壓縮
  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageError('');

    try {
      const compressedImage = await compressImage(file);

      updateForm('image', compressedImage);
    } catch (error) {
      setImageError(error.message);
    }

    // 清空 input，讓使用者可以再次選擇同一張圖片
    event.target.value = '';
  }

  // 移除目前選擇的圖片
  function handleRemoveImage() {
    updateForm('image', '');
    setImageError('');
  }

  return (
    <section className="owner-panel menu-admin">
      <h2>🍳 菜單管理</h2>

      <form className="menu-form" onSubmit={handleSaveMenu}>
        <label>
          餐點名稱
          <input
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            placeholder="例如：鮪魚蛋餅"
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
            placeholder="例如：45"
            required
          />
        </label>

        <label>
          餐點描述
          <input
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            placeholder="例如：香酥蛋餅搭配鮮嫩鮪魚"
          />
        </label>

        <div className="menu-image-field">
          <span className="menu-image-label">餐點圖片</span>

          <input
            id="menu-image-upload"
            className="menu-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
          />

          <label
            htmlFor="menu-image-upload"
            className="menu-image-upload-button"
          >
          <span>選擇圖片</span>
        </label>        

          {imageError && (
            <p className="menu-image-error" role="alert">
              {imageError}
            </p>
          )}

          {form.image && (
            <div className="menu-image-preview">
              <img
                src={form.image}
                alt="餐點圖片預覽"
              />

              <button
                type="button"
                onClick={handleRemoveImage}
              >
                移除圖片
              </button>
            </div>
          )}
        </div>

        <div className="menu-form-actions">
          <button type="submit">
            {editingId !== null ? '儲存修改' : '新增餐點'}
          </button>

          {editingId !== null && (
            <button type="button" onClick={resetForm}>
              取消修改
            </button>
          )}
        </div>

        {menuMessage && (
          <p className="menu-message" role="status">
            {menuMessage}
          </p>
        )}
      </form>

      <h3>現有餐點（{menuItems.length} 項）</h3>

      <div className="menu-admin-list">
        {menuItems.map((item) => (
          <article className="menu-admin-item" key={item.id}>
            <div className="menu-admin-info">
              <strong>{item.name}</strong>
              <span>NT$ {item.price}</span>
              <span>
                {item.available === false ? '目前已下架' : '供應中'}
              </span>
            </div>

            <div className="menu-admin-actions">
              <button
                type="button"
                onClick={() => handleEditMenu(item)}
              >
                編輯
              </button>

              <button
                type="button"
                onClick={() => handleToggleMenu(item.id)}
              >
                {item.available === false ? '重新上架' : '下架'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
