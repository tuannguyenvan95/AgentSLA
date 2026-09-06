import React, { useState } from 'react';
import { 
  X, 
  FileCode2, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { DEFAULT_CONTRACT_ADDRESS } from '../config/genlayer';

interface ContractConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSaveAddress: (address: string) => void;
}

export const ContractConfigModal: React.FC<ContractConfigModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSaveAddress,
}) => {
  const [addressInput, setAddressInput] = useState<string>(
    currentAddress === DEFAULT_CONTRACT_ADDRESS ? '' : currentAddress
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addressInput.trim();
    if (!clean) {
      // Reset to default
      onSaveAddress(DEFAULT_CONTRACT_ADDRESS);
      onClose();
      return;
    }

    if (!clean.startsWith('0x') || clean.length !== 42) {
      setError('Địa chỉ contract không hợp lệ. Phải là địa chỉ hex 0x... gồm 42 ký tự.');
      return;
    }

    setError(null);
    onSaveAddress(clean);
    onClose();
  };

  const handleReset = () => {
    setAddressInput('');
    setError(null);
    onSaveAddress(DEFAULT_CONTRACT_ADDRESS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Cấu hình Intelligent Contract On-Chain
              </h3>
              <p className="text-xs text-slate-400">
                Kết nối địa chỉ contract đã deploy trên GenLayer Studionet (Chain 61999)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 text-sm text-slate-300 relative z-10">
          {/* Current status */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Trạng thái hiện tại:</span>
              {currentAddress && currentAddress !== DEFAULT_CONTRACT_ADDRESS ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã kết nối On-Chain
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 font-mono font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Chưa liên kết Contract On-Chain
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-cyan-300 break-all bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800">
              {currentAddress}
            </div>
          </div>

          {/* Form to enter new address */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nhập địa chỉ Contract mới (0x...):
              </label>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value);
                  setError(null);
                }}
                placeholder="0x..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs font-mono text-white placeholder-slate-600 transition-colors"
              />
              {error && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 transition-all shadow-md shadow-cyan-500/20"
                >
                  Lưu & Đồng bộ On-Chain
                </button>
              </div>
            </div>
          </form>

          {/* Quick Guide to Deploy on GenLayer Studio */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Cách Deploy Contract 1 phút trên GenLayer Studio:
            </h4>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <li>
                Mở <a 
                  href="https://studio.genlayer.com/run-debug" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-cyan-400 underline inline-flex items-center gap-0.5 font-medium hover:text-cyan-300"
                >
                  GenLayer Studio Run/Debug <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
              <li>
                Tạo file mới hoặc mở file contract, dán toàn bộ mã nguồn từ <code className="text-cyan-300 font-mono">contracts/contract.py</code> vào.
              </li>
              <li>
                Tại tab <strong>Run/Debug</strong>, chọn tài khoản có GEN và bấm <strong>Deploy</strong>.
              </li>
              <li>
                Sao chép <strong>Contract Address</strong> sinh ra (bắt đầu bằng <code className="text-slate-200">0x...</code>) rồi dán vào ô bên trên và bấm <strong>Lưu & Đồng bộ</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
