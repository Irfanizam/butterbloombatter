import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, productsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import type { Category, Product } from '../../types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null; // null = create
  categories: Category[];
  onCreated?: (product: Product) => void; // switch to edit mode after create (for gallery)
}

export function ProductFormModal({ open, onClose, product, categories, onCreated }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pieces, setPieces] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Gallery images (edit mode only — a product id is required).
  const { data: detail } = useQuery({
    queryKey: ['product-detail', product?.id],
    queryFn: () => productsApi.get(product!.id),
    enabled: open && !!product,
  });
  const galleryImages = detail?.images ?? product?.images ?? [];

  const addImages = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      return productsApi.addImages(product!.id, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-detail', product?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Photos added');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add photos')),
  });

  const removeImage = useMutation({
    mutationFn: (imageId: number) => productsApi.removeImage(product!.id, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-detail', product?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove photo')),
  });

  // Reset form whenever the modal opens or the target product changes.
  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setCategoryId(product?.categoryId ?? (categories[0]?.id ?? ''));
    setDescription(product?.description ?? '');
    setPrice(product ? String(product.price) : '');
    setPieces(product?.pieces != null ? String(product.pieces) : '');
    setIsAvailable(product?.isAvailable ?? true);
    setIsFeatured(product?.isFeatured ?? false);
    setImageFile(null);
    setPreview(product?.imageUrl ?? null);
    setProgress(0);
  }, [open, product, categories]);

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error('Only JPG, PNG, or WEBP images are allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 5MB or smaller');
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => selectFile(e.target.files?.[0]);
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    selectFile(e.dataTransfer.files?.[0]);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('categoryId', String(categoryId));
      fd.append('description', description);
      fd.append('price', price);
      fd.append('pieces', pieces);
      fd.append('isAvailable', String(isAvailable));
      fd.append('isFeatured', String(isFeatured));
      if (imageFile) fd.append('image', imageFile);
      const onProgress = (e: { loaded: number; total?: number }) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      return product
        ? productsApi.update(product.id, fd, onProgress)
        : productsApi.create(fd, onProgress);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (!product && onCreated) {
        // Keep the modal open in edit mode so photos can be added right away.
        toast.success('Product created — now add gallery photos below 📷');
        onCreated(saved);
      } else {
        toast.success(product ? 'Product updated' : 'Product created');
        onClose();
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save product')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (categoryId === '') return toast.error('Category is required');
    if (!price) return toast.error('Price is required');
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={mutation.isPending}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Product Name *">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <Field label="Category *">
          <select
            className={inputCls}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            className={inputCls}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (RM) *">
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </Field>
          <Field label="Pieces per jar">
            <input
              className={inputCls}
              type="number"
              min="0"
              value={pieces}
              onChange={(e) => setPieces(e.target.value)}
              placeholder="e.g. 30"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-brand bg-brand-soft px-3 py-2">
          <span className="text-sm font-medium text-brand-dark">Available for sale</span>
          <Toggle checked={isAvailable} onChange={setIsAvailable} />
        </div>
        <div className="flex items-center justify-between rounded-brand bg-brand-soft px-3 py-2">
          <span className="text-sm font-medium text-brand-dark">Featured on homepage</span>
          <Toggle checked={isFeatured} onChange={setIsFeatured} />
        </div>

        <Field label="Product Image">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="cursor-pointer rounded-brand border-2 border-dashed border-brand-border p-4 text-center transition-colors hover:border-brand-primary"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded-brand object-contain" />
            ) : (
              <p className="text-sm text-brand-faded">
                Drag &amp; drop an image here, or click to browse
                <br />
                <span className="text-xs">JPG / PNG / WEBP · max 5MB</span>
              </p>
            )}
            {preview && (
              <p className="mt-2 text-xs font-semibold text-brand-primary">
                {imageFile ? 'New image selected' : 'Current image — click to replace'}
              </p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </Field>

        {mutation.isPending && imageFile && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-border">
            <div className="h-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Gallery (edit mode only — needs a saved product) */}
        {product ? (
          <div className="border-t border-brand-border-soft pt-4">
            <span className="mb-2 block text-sm font-semibold text-brand-dark">
              Gallery photos (catalogue)
            </span>
            {galleryImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative">
                    <img src={img.url} alt="" className="h-20 w-full rounded-brand object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage.mutate(img.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-faded">
                No extra photos yet — add some for the storefront catalogue carousel.
              </p>
            )}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                // Materialise the FileList into an array BEFORE clearing the
                // input, otherwise the live FileList empties before upload.
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length) addImages.mutate(files);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              loading={addImages.isPending}
              onClick={() => galleryInputRef.current?.click()}
            >
              + Add photos
            </Button>
          </div>
        ) : (
          <p className="border-t border-brand-border-soft pt-4 text-xs text-brand-faded">
            Save the product first, then edit it to add gallery photos.
          </p>
        )}
      </form>
    </Modal>
  );
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand-dark">{label}</span>
      {children}
    </label>
  );
}
