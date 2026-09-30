import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { haptic } from '../lib/telegram';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
    <div className="w-full sm:max-w-lg max-h-[85vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <h3 className="font-['Syne'] font-bold text-sm sm:text-base text-white">{title}</h3>
        <button
          onClick={() => {
            haptic.selection();
            onClose();
          }}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Body */}
      <div className="p-4 overflow-y-auto no-scrollbar text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </div>
  </div>
);

export const ContentPolicyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalWrapper title="Authorized Content Policy" onClose={onClose}>
    <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-200 flex items-start gap-2.5">
      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-bold block mb-0.5">High-Fidelity Streaming Commitment</span>
        Stark Anime provides licensed, high-definition streaming for anime series and feature films.
      </div>
    </div>

    <h4 className="font-bold text-white text-xs mt-2">1. Authorized Streaming</h4>
    <p>
      Every anime series, movie, season, and individual episode uploaded to the Stark Anime platform is reviewed and managed exclusively by authorized administrators.
    </p>

    <h4 className="font-bold text-white text-xs">2. Fast Cloud Playback</h4>
    <p>
      Stark Anime provides temporary, signed multi-quality streaming tokens for seamless mobile playback with minimal buffering.
    </p>

    <h4 className="font-bold text-white text-xs">3. Content Safety Standards</h4>
    <p>
      Stark Anime enforces family and adolescent safety standards. Explicit adult or harmful content is prevented from being ingested or published.
    </p>
  </ModalWrapper>
);

export const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalWrapper title="Privacy Policy" onClose={onClose}>
    <p>
      Stark Anime respects your privacy while using our Telegram Mini App.
    </p>
    <h4 className="font-bold text-white text-xs mt-2">1. Data Handled</h4>
    <p>
      We store only your public Telegram ID and first name to maintain your watch history, resume positions, and saved bookmarks.
    </p>
    <h4 className="font-bold text-white text-xs">2. Zero Tracking</h4>
    <p>
      No third-party trackers, cross-site telemetry, or advertising SDKs are embedded in the app.
    </p>
    <h4 className="font-bold text-white text-xs">3. Right to Deletion</h4>
    <p>
      You have the permanent right to wipe all stored records at any moment by clicking "Delete My Data" in your Profile tab.
    </p>
  </ModalWrapper>
);

export const PrivacyPolicyModal = PrivacyModal;

export const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalWrapper title="Terms of Service" onClose={onClose}>
    <p>
      By accessing Stark Anime via Telegram, you agree to these Terms of Service.
    </p>
    <h4 className="font-bold text-white text-xs mt-2">1. Permitted Use</h4>
    <p>
      Stark Anime is provided for personal, mobile streaming within the Telegram client.
    </p>
    <h4 className="font-bold text-white text-xs">2. Service Availability</h4>
    <p>
      We strive for maximum uptime, high-definition playback, and smooth performance across all devices.
    </p>
  </ModalWrapper>
);
