import { useState, useRef } from 'react';
import { Upload, File, X, Loader } from 'lucide-react';
import { uploadFile } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';

interface FileUploadProps {
  type: 'avatar' | 'resume' | 'document';
  accept: string;
  onUpload: (url: string) => void;
  currentFile?: string;
  label: string;
}

export const FileUpload = ({ type, accept, onUpload, currentFile, label }: FileUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentFile || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const bucket = type === 'avatar' ? 'avatars' : type === 'resume' ? 'resumes' : 'documents';
      const url = await uploadFile(file, bucket, user.id);

      if (url) {
        setPreview(url);
        onUpload(url);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>

      {preview && type !== 'avatar' && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <File className="w-5 h-5 text-blue-600" />
          <span className="flex-1 text-sm text-gray-700 truncate">{preview.split('/').pop()}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {preview && type === 'avatar' && (
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200">
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-white bg-gray-100 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Enviando...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-gray-600 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {preview ? 'Alterar' : 'Selecionar'} Arquivo
            </span>
          </>
        )}
      </button>
    </div>
  );
};
