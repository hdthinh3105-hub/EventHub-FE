import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '@/api/events';
import { EventForm } from '@/components/EventForm';
import { useToast } from '@/components/Toast';

export function EventCreatePage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  const pickImage = (file: File) => {
    setImageFile(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handler = async (data: Parameters<React.ComponentProps<typeof EventForm>['onSubmit']>[0]) => {
    setSubmitting(true);
    try {
      const ev = await eventApi.create(data);
      if (imageFile) {
        await eventApi.uploadCover(ev.id, imageFile);
      }
      notify(
        imageFile
          ? 'Tạo sự kiện thành công! Đã lưu ảnh bìa. Giờ bạn có thể thêm loại vé.'
          : 'Tạo sự kiện thành công! Bạn có thể thêm loại vé và thêm ảnh bìa trong mục Quản lý.',
      );
      navigate(`/organizer/events/${ev.id}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Tạo sự kiện thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-heading">Tạo sự kiện mới</h1>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Ảnh bìa (không bắt buộc)</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {preview ? (
              <img src={preview} alt="Ảnh bìa đã chọn" style={{ width: 220, height: 120, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div
                style={{
                  width: 220,
                  height: 120,
                  border: '2px dashed var(--color-border)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-soft)',
                  fontSize: 13,
                }}
              >
                Chưa có ảnh
              </div>
            )}
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              {imageFile ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa (jpg/png/webp, ≤5MB)'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickImage(f);
                }}
              />
            </label>
            {imageFile && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setImageFile(null);
                  setPreview('');
                }}
              >
                Bỏ chọn
              </button>
            )}
          </div>
        </div>

        <EventForm submitting={submitting} onSubmit={handler} />
      </div>
    </div>
  );
}